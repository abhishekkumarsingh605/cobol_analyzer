// Robust COBOL & Mainframe codebase analyzer for enterprise modernization
// Parses COBOL programs, copybooks, JCL scripts, SQL statements, and call graphs

/**
 * Format bytes into human-readable strings
 */
export function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Clean COBOL source code lines:
 * Handles fixed format (cols 1-6 sequence, col 7 indicator, cols 8-72 code)
 * and free format COBOL.
 */
export function preprocessCobol(source) {
  const lines = source.split(/\r?\n/);
  const cleaned = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let code = rawLine;

    // Fixed format check: col 7 indicator
    if (rawLine.length >= 7) {
      const indicator = rawLine[6];
      if (indicator === '*' || indicator === '/') {
        cleaned.push({ lineNum: i + 1, raw: rawLine, code: '', isComment: true });
        continue;
      }
      if (indicator === 'D' || indicator === 'd') {
        cleaned.push({ lineNum: i + 1, raw: rawLine, code: '', isComment: true });
        continue;
      }
      // Check sequence number area
      const seqArea = rawLine.substring(0, 6);
      if (/^[\d\s]{6}$/.test(seqArea) && (indicator === ' ' || indicator === '-')) {
        const codeArea = rawLine.substring(7, 72);
        code = codeArea;
      }
    }

    // Handle free-format inline comment *>
    const inlineCommentIdx = code.indexOf('*>');
    if (inlineCommentIdx !== -1) {
      code = code.substring(0, inlineCommentIdx);
    }

    cleaned.push({
      lineNum: i + 1,
      raw: rawLine,
      code: code,
      isComment: false
    });
  }

  return cleaned;
}

/**
 * Extract PROGRAM-ID from lines
 */
function extractProgramId(lines, defaultName) {
  const text = lines.map(l => l.code).join(' ');
  const match = text.match(/PROGRAM-ID\s*\.\s*['"]?([A-Z0-9_-]+)['"]?/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return defaultName.replace(/\.[^/.]+$/, '').toUpperCase();
}

/**
 * Extract COPY / INCLUDE statements
 */
function extractCopybooks(lines) {
  const copybooks = [];
  const joinedLines = lines.map(l => ({ lineNum: l.lineNum, code: l.code }));

  for (const item of joinedLines) {
    const code = item.code;
    if (!code) continue;

    // Standard COPY statement
    const copyRegex = /\bCOPY\s+['"]?([A-Z0-9_-]+)['"]?(?:\s+(?:OF|IN)\s+['"]?([A-Z0-9_-]+)['"]?)?/gi;
    let match;
    while ((match = copyRegex.exec(code)) !== null) {
      const name = match[1].toUpperCase();
      if (name && name !== 'REPLACING') {
        copybooks.push({
          name,
          library: match[2] ? match[2].toUpperCase() : null,
          lineNum: item.lineNum,
          rawCode: code.trim(),
          type: 'COPY'
        });
      }
    }

    // Panvalet / Librarian includes
    const panvaletRegex = /(?:\+\+INCLUDE|-INC)\s+([A-Z0-9_-]+)/gi;
    while ((match = panvaletRegex.exec(code)) !== null) {
      copybooks.push({
        name: match[1].toUpperCase(),
        lineNum: item.lineNum,
        rawCode: code.trim(),
        type: 'PANVALET_INCLUDE'
      });
    }

    // SQL INCLUDE: EXEC SQL INCLUDE member-name END-EXEC
    const sqlIncludeRegex = /EXEC\s+SQL\s+INCLUDE\s+([A-Z0-9_-]+)\s+END-EXEC/gi;
    while ((match = sqlIncludeRegex.exec(code)) !== null) {
      copybooks.push({
        name: match[1].toUpperCase(),
        lineNum: item.lineNum,
        rawCode: code.trim(),
        type: 'SQL_INCLUDE'
      });
    }
  }

  return copybooks;
}

/**
 * Extract external program CALLs and CICS LINK/XCTL
 */
function extractCalls(lines) {
  const calls = [];
  
  for (const item of lines) {
    const code = item.code;
    if (!code) continue;

    // Static CALL: CALL 'PROGNAME' [USING ...]
    const staticCallRegex = /\bCALL\s+['"]([A-Z0-9_-]+)['"](?:\s+USING\s+([^.]+))?/gi;
    let match;
    while ((match = staticCallRegex.exec(code)) !== null) {
      const target = match[1].toUpperCase();
      const params = match[2] ? match[2].trim().split(/\s*,\s*|\s+/).filter(Boolean) : [];
      calls.push({
        target,
        type: 'STATIC_CALL',
        dynamic: false,
        params,
        lineNum: item.lineNum,
        rawCode: code.trim()
      });
    }

    // Dynamic CALL: CALL IDENTIFIER [USING ...]
    const dynamicCallRegex = /\bCALL\s+([A-Z0-9_-]+)(?:\s+USING\s+([^.]+))?/gi;
    while ((match = dynamicCallRegex.exec(code)) !== null) {
      const token = match[1].toUpperCase();
      if (token.startsWith("'") || token.startsWith('"') || token === 'USING' || token === 'CONTENT' || token === 'REFERENCE') {
        continue;
      }
      const isAlreadyAdded = calls.some(c => c.lineNum === item.lineNum && c.target === token);
      if (!isAlreadyAdded) {
        const params = match[2] ? match[2].trim().split(/\s*,\s*|\s+/).filter(Boolean) : [];
        calls.push({
          target: token,
          type: 'DYNAMIC_CALL',
          dynamic: true,
          params,
          lineNum: item.lineNum,
          rawCode: code.trim()
        });
      }
    }

    // CICS LINK / XCTL: EXEC CICS LINK PROGRAM('PROGNAME')
    const cicsRegex = /EXEC\s+CICS\s+(LINK|XCTL)\s+PROGRAM\s*\(\s*['"]?([A-Z0-9_-]+)['"]?\s*\)/gi;
    while ((match = cicsRegex.exec(code)) !== null) {
      calls.push({
        target: match[2].toUpperCase(),
        type: `CICS_${match[1].toUpperCase()}`,
        dynamic: false,
        params: [],
        lineNum: item.lineNum,
        rawCode: code.trim()
      });
    }
  }

  return calls;
}

/**
 * Extract internal PERFORM statements
 */
function extractPerforms(lines) {
  const performs = [];
  for (const item of lines) {
    const code = item.code;
    if (!code) continue;

    const performRegex = /\bPERFORM\s+([A-Z0-9_-]+)(?:\s+THRU\s+([A-Z0-9_-]+))?/gi;
    let match;
    while ((match = performRegex.exec(code)) !== null) {
      const target = match[1].toUpperCase();
      if (['UNTIL', 'VARYING', 'WITH', 'TEST', 'CYCLE'].includes(target)) continue;
      performs.push({
        target,
        thru: match[2] ? match[2].toUpperCase() : null,
        lineNum: item.lineNum
      });
    }
  }
  return performs;
}

/**
 * Extract Mainframe SME Metrics (Paragraphs, Procedures/Sections, Divisions, Complexity)
 */
function extractMainframeSmeDetails(lines, rawContent, filename, category) {
  if (category === 'JCL') {
    // Parse JCL-specific SME details
    const rawLines = rawContent.split(/\r?\n/);
    let jobName = null;
    const stepsList = [];
    const ddList = [];
    const referencedPrograms = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line.startsWith('//') || line.startsWith('//*')) continue;

      // Match JOB statement
      const jobMatch = line.match(/^\/\/([A-Z0-9#$@_-]+)\s+JOB\b/i);
      if (jobMatch && !jobName) {
        jobName = jobMatch[1].toUpperCase();
      }

      // Match EXEC statement (EXEC PGM= or EXEC PROC=)
      const execMatch = line.match(/^\/\/([A-Z0-9#$@_-]+)\s+EXEC\s+(?:PGM|PROC)=([A-Z0-9_-]+)/i);
      if (execMatch) {
        const stepName = execMatch[1].toUpperCase();
        const pgmName = execMatch[2].toUpperCase();
        stepsList.push({ stepName, pgmName, lineNum: i + 1 });
        if (!referencedPrograms.includes(pgmName)) {
          referencedPrograms.push(pgmName);
        }
      }

      // Match DD statement
      const ddMatch = line.match(/^\/\/([A-Z0-9#$@_-]+)\s+DD\b(.*)/i);
      if (ddMatch) {
        const ddName = ddMatch[1].toUpperCase();
        const rest = ddMatch[2] || '';
        const dsnMatch = rest.match(/DSN=([^,\s]+)/i);
        const dispMatch = rest.match(/DISP=([^,\s)]+)/i);
        ddList.push({
          ddName,
          dsn: dsnMatch ? dsnMatch[1] : (rest.includes('SYSOUT') ? 'SYSOUT' : 'INTERNAL'),
          disp: dispMatch ? dispMatch[1] : null,
          lineNum: i + 1
        });
      }
    }

    return {
      category: 'JCL',
      jobName: jobName || filename.replace(/\.[^/.]+$/, '').toUpperCase(),
      stepsCount: stepsList.length,
      stepsList,
      ddStatementsCount: ddList.length,
      ddList,
      referencedPrograms,
      paragraphsCount: 0,
      sectionsCount: 0,
      paragraphsList: [],
      sectionsList: []
    };
  }

  if (category === 'COBOL') {
    const rawLines = rawContent.split(/\r?\n/);
    const divisions = {
      identification: false,
      environment: false,
      data: false,
      procedure: false
    };

    const sectionsList = [];
    const paragraphsList = [];
    let inProcedureDivision = false;

    // Statement counts for SME analysis
    let performCount = 0;
    let callCount = 0;
    let sqlCount = 0;
    let cicsCount = 0;
    let evaluateCount = 0;
    let ifCount = 0;
    let fileIoCount = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      let code = line;

      // Handle fixed-format indicator
      if (line.length >= 7) {
        const indicator = line[6];
        if (indicator === '*' || indicator === '/') continue;
        if (/^[\d\s]{6}$/.test(line.substring(0, 6))) {
          code = line.substring(7);
        }
      }

      const upper = code.toUpperCase();

      // Check divisions
      if (upper.includes('IDENTIFICATION DIVISION')) divisions.identification = true;
      if (upper.includes('ENVIRONMENT DIVISION')) divisions.environment = true;
      if (upper.includes('DATA DIVISION')) divisions.data = true;
      if (upper.includes('PROCEDURE DIVISION')) {
        divisions.procedure = true;
        inProcedureDivision = true;
      }

      // Check Section headers (e.g. 0000-MAIN-DISPATCH SECTION.)
      const sectionMatch = code.match(/^\s*([A-Z0-9][A-Z0-9_-]*)\s+SECTION\s*\./i);
      if (sectionMatch) {
        const secName = sectionMatch[1].toUpperCase();
        sectionsList.push({ name: secName, lineNum: i + 1 });
        continue;
      }

      // Check Paragraphs inside PROCEDURE DIVISION
      if (inProcedureDivision) {
        // Paragraph header in COBOL ends with a dot on its own or followed by comments
        const paraMatch = code.match(/^\s{0,8}([A-Z0-9][A-Z0-9_-]*)\s*\.\s*$/i);
        if (paraMatch) {
          const pName = paraMatch[1].toUpperCase();
          if (!['EXIT', 'GOBACK', 'STOP', 'END-IF', 'END-EXEC', 'END-PERFORM', 'END-EVALUATE', 'SECTION'].includes(pName)) {
            paragraphsList.push({ name: pName, lineNum: i + 1 });
          }
        }

        // Count verbs
        if (/\bPERFORM\b/i.test(upper)) performCount++;
        if (/\bCALL\b/i.test(upper)) callCount++;
        if (/\bEXEC\s+SQL\b/i.test(upper)) sqlCount++;
        if (/\bEXEC\s+CICS\b/i.test(upper)) cicsCount++;
        if (/\bEVALUATE\b/i.test(upper)) evaluateCount++;
        if (/\bIF\b/i.test(upper)) ifCount++;
      }

      if (/\bSELECT\s+[A-Z0-9_-]+\s+ASSIGN\b/i.test(upper)) {
        fileIoCount++;
      }
    }

    // Cyclomatic complexity estimation
    const cyclomaticComplexity = 1 + ifCount + evaluateCount + performCount;
    const complexityRating = cyclomaticComplexity > 30 ? 'HIGH' : cyclomaticComplexity > 12 ? 'MODERATE' : 'LOW';

    return {
      category: 'COBOL',
      divisions,
      paragraphsCount: paragraphsList.length,
      paragraphsList,
      sectionsCount: sectionsList.length,
      sectionsList,
      statements: {
        performCount,
        callCount,
        sqlCount,
        cicsCount,
        evaluateCount,
        ifCount,
        fileIoCount
      },
      cyclomaticComplexity,
      complexityRating
    };
  }

  if (category === 'COPYBOOK') {
    // Copybook record layouts
    const recordDefs = (rawContent.match(/^\s{0,8}01\s+([A-Z0-9_-]+)/gim) || []).map(r => r.trim());
    const hasDclgen = /EXEC\s+SQL\s+DECLARE\s+[A-Z0-9_.]+\s+TABLE/i.test(rawContent);

    return {
      category: 'COPYBOOK',
      recordDefinitionsCount: recordDefs.length,
      recordDefinitions: recordDefs,
      dclgenDetected: hasDclgen,
      paragraphsCount: 0,
      sectionsCount: 0,
      paragraphsList: [],
      sectionsList: []
    };
  }

  // OTHER file type
  return {
    category: 'OTHER',
    fileTypeDescription: filename.endsWith('.sql') || filename.endsWith('.ddl') ? 'Database SQL / DDL Script' : 'Mainframe Text / Config',
    paragraphsCount: 0,
    sectionsCount: 0,
    paragraphsList: [],
    sectionsList: []
  };
}

/**
 * Extract EXEC SQL blocks and parse database schemas, queries, tables, and CRUD operations
 */
/**
 * Extract EXEC SQL blocks and parse database schemas, queries, tables, and CRUD operations
 */
function extractSqlStatements(lines) {
  const fullText = lines.map(l => l.code).join('\n');
  const sqlBlocks = [];
  const sqlRegex = /EXEC\s+SQL([\s\S]*?)END-EXEC/gi;
  let match;

  while ((match = sqlRegex.exec(fullText)) !== null) {
    // Strip embedded line sequence numbers from SQL text
    const sqlText = match[1].replace(/\b\d{6,8}\b/g, ' ').replace(/\s+/g, ' ').trim();
    const precedingText = fullText.substring(0, match.index);
    const lineNum = precedingText.split('\n').length;

    if (/^\s*INCLUDE\s+SQLCA\b/i.test(sqlText)) {
      continue;
    }

    sqlBlocks.push({
      sql: sqlText,
      lineNum
    });
  }

  const databaseOperations = [];
  const tableMap = new Map();

  for (const block of sqlBlocks) {
    const sql = block.sql;
    let operation = 'UNKNOWN';
    let tables = [];
    let columns = [];
    let hostVariables = [];

    const hvMatches = sql.match(/:([A-Z0-9_-]+)/gi);
    if (hvMatches) {
      hostVariables = [...new Set(hvMatches.map(v => v.substring(1).toUpperCase()))];
    }

    if (/^\s*SELECT\b/i.test(sql)) {
      operation = 'SELECT';
      const fromMatch = sql.match(/\bFROM\s+([A-Z0-9_.,\s]+?)(?:\s+WHERE|\s+ORDER|\s+GROUP|\s+HAVING|\s+INNER|\s+LEFT|\s+RIGHT|\s+JOIN|\s+FOR|\s+WITH|$)/i);
      if (fromMatch) {
        tables = fromMatch[1].split(',').map(t => t.trim().split(/\s+/)[0].toUpperCase()).filter(t => t && !['JOIN', 'ON', 'AS'].includes(t));
      }
      const colMatch = sql.match(/^\s*SELECT\s+([\s\S]+?)\s+FROM\b/i);
      if (colMatch) {
        const rawCols = colMatch[1];
        if (rawCols.trim() !== '*') {
          columns = rawCols.split(',').map(c => {
            const cleanCol = c.trim().replace(/^DISTINCT\s+/i, '').split(/\s+INTO\s+/i)[0].split(/\s+AS\s+/i)[0].trim();
            const parts = cleanCol.split('.');
            return parts[parts.length - 1].toUpperCase();
          }).filter(c => c && !c.includes(':') && !c.includes('('));
        }
      }
    } else if (/^\s*INSERT\s+INTO\b/i.test(sql)) {
      operation = 'INSERT';
      const insertMatch = sql.match(/INSERT\s+INTO\s+([A-Z0-9_.]+)(?:\s*\(([^)]+)\))?/i);
      if (insertMatch) {
        const tbl = insertMatch[1].trim().split('.').pop().toUpperCase();
        tables = [tbl];
        if (insertMatch[2]) {
          columns = insertMatch[2].split(',').map(c => c.trim().toUpperCase());
        }
      }
    } else if (/^\s*UPDATE\b/i.test(sql)) {
      operation = 'UPDATE';
      const updateMatch = sql.match(/UPDATE\s+([A-Z0-9_.]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE|$)/i);
      if (updateMatch) {
        const tbl = updateMatch[1].trim().split('.').pop().toUpperCase();
        tables = [tbl];
        const setClause = updateMatch[2];
        const setCols = setClause.split(',').map(s => {
          const colPart = s.split('=')[0].trim().toUpperCase();
          return colPart.split('.').pop();
        }).filter(Boolean);
        columns = setCols;
      }
    } else if (/^\s*DELETE\s+FROM\b/i.test(sql)) {
      operation = 'DELETE';
      const delMatch = sql.match(/DELETE\s+FROM\s+([A-Z0-9_.]+)/i);
      if (delMatch) {
        const tbl = delMatch[1].trim().split('.').pop().toUpperCase();
        tables = [tbl];
      }
    } else if (/^\s*DECLARE\s+[A-Z0-9_-]+\s+CURSOR\s+FOR\s+SELECT\b/i.test(sql)) {
      operation = 'SELECT_CURSOR';
      const fromMatch = sql.match(/\bFROM\s+([A-Z0-9_.,\s]+?)(?:\s+WHERE|\s+ORDER|\s+GROUP|\s+FOR|\s+WITH|$)/i);
      if (fromMatch) {
        tables = fromMatch[1].split(',').map(t => t.trim().split(/\s+/)[0].toUpperCase()).filter(t => t && !['JOIN', 'ON', 'AS'].includes(t));
      }
      const colMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM\b/i);
      if (colMatch && colMatch[1].trim() !== '*') {
        columns = colMatch[1].split(',').map(c => c.trim().split(/\s+/)[0].split('.').pop().toUpperCase()).filter(c => c && !c.includes(':'));
      }
    } else if (/^\s*DECLARE\s+([A-Z0-9_.]+)\s+TABLE\s*\(([\s\S]+)\)/i.test(sql)) {
      operation = 'DECLARE_TABLE';
      const dclMatch = sql.match(/DECLARE\s+([A-Z0-9_.]+)\s+TABLE\s*\(([\s\S]+)\)/i);
      if (dclMatch) {
        const tbl = dclMatch[1].trim().split('.').pop().toUpperCase();
        tables = [tbl];
        const colDefs = dclMatch[2].split(',').map(colDef => {
          const parts = colDef.trim().split(/\s+/);
          const colName = parts[0] ? parts[0].toUpperCase() : '';
          const colType = parts.slice(1).join(' ').toUpperCase();
          return { name: colName, type: colType };
        }).filter(c => c.name);
        columns = colDefs.map(c => c.name);

        if (!tableMap.has(tbl)) {
          tableMap.set(tbl, { name: tbl, columns: colDefs, declared: true });
        } else {
          const existing = tableMap.get(tbl);
          existing.declared = true;
          existing.columns = colDefs;
        }
      }
    }

    const cleanedTables = tables.map(t => {
      const parts = t.split('.');
      return parts[parts.length - 1].toUpperCase();
    }).filter(t => t && !['WHERE', 'FROM', 'INTO', 'SET', 'TABLE', 'VALUES'].includes(t));

    for (const tbl of cleanedTables) {
      if (!tableMap.has(tbl)) {
        tableMap.set(tbl, {
          name: tbl,
          columns: columns.map(c => ({ name: c, type: inferColumnType(c) })),
          declared: false
        });
      } else {
        const current = tableMap.get(tbl);
        const existingColNames = new Set(current.columns.map(c => c.name));
        for (const col of columns) {
          if (!existingColNames.has(col)) {
            current.columns.push({ name: col, type: inferColumnType(col) });
            existingColNames.add(col);
          }
        }
      }
    }

    databaseOperations.push({
      operation,
      tables: cleanedTables,
      columns,
      hostVariables,
      sql,
      lineNum: block.lineNum
    });
  }

  return {
    operations: databaseOperations,
    schemas: Array.from(tableMap.values())
  };
}

/**
 * Infer SQL column data type
 */
function inferColumnType(colName) {
  const col = colName.toUpperCase();
  if (col.endsWith('_ID') || col === 'ID' || col.endsWith('_NUM') || col.endsWith('_NO') || col.endsWith('_KEY')) {
    return 'BIGINT NOT NULL';
  }
  if (col.endsWith('_AMT') || col.endsWith('_BAL') || col.endsWith('_BALANCE') || col.endsWith('_PRICE') || col.endsWith('_RATE') || col.endsWith('_LIMIT') || col.endsWith('_CREDIT') || col.endsWith('_DEBIT')) {
    return 'DECIMAL(15,2)';
  }
  if (col.endsWith('_DATE') || col === 'DATE' || col.endsWith('_DT')) {
    return 'DATE';
  }
  if (col.endsWith('_TIME') || col.endsWith('_TS') || col.endsWith('_TIMESTAMP')) {
    return 'TIMESTAMP';
  }
  if (col.endsWith('_CODE') || col.endsWith('_CD') || col.endsWith('_STATUS') || col.endsWith('_FLAG') || col.endsWith('_TYPE') || col.endsWith('_IND')) {
    return 'CHAR(4)';
  }
  if (col.endsWith('_DESC') || col.endsWith('_NAME') || col.endsWith('_ADDR') || col.endsWith('_EMAIL') || col.endsWith('_TEXT') || col.endsWith('_CITY')) {
    return 'VARCHAR(100)';
  }
  return 'VARCHAR(50)';
}

/**
 * Enterprise Mainframe Table & Dataset Canonical Mappings
 */
export const TABLE_CANONICAL_MAP = {};

export const COPYBOOK_TO_TABLE = {};

/**
 * Extract canonical table name from Mainframe DSN
 */
export function extractTableNameFromDsn(dsn) {
  if (!dsn) return '';
  const parts = dsn.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].toUpperCase();
    if (!['KSDS', 'ESDS', 'RRDS', 'VSAM', 'DATA', 'PS', 'CLUSTER'].includes(part)) {
      return part;
    }
  }
  return parts[parts.length - 1];
}

/**
 * Resolve canonical table name from any alias or variable
 */
export function resolveCanonicalTable(rawName) {
  if (!rawName) return null;
  const trimmed = rawName.trim().toUpperCase();
  const shortName = trimmed.includes('.') ? extractTableNameFromDsn(trimmed) : trimmed;
  if (TABLE_CANONICAL_MAP[shortName]) return TABLE_CANONICAL_MAP[shortName];
  if (TABLE_CANONICAL_MAP[trimmed]) return TABLE_CANONICAL_MAP[trimmed];

  return shortName
    .replace(/^(?:WS-|LIT-)/, '')
    .replace(/-(?:FILE|RECORD|INPUT|OUTPUT|PATH|REC)$/, '')
    .replace(/_(?:FILE|RECORD|INPUT|OUTPUT|PATH|REC)$/, '');
}

/**
 * Parse standalone DDL & SQL files (e.g. .ddl, .sql, .dcl)
 */
function extractDdlSchemas(content, filename) {
  const schemas = [];
  const indexes = [];

  // Match CREATE TABLE [schema.]<tableName> ( <columns> )
  const tableRegex = /CREATE\s+TABLE\s+([A-Z0-9_.]+)\s*\(([\s\S]*?)\)(?:\s*;|\s+IN\b|\s*$)/gi;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const rawTableName = match[1].trim();
    const parts = rawTableName.split('.');
    const schema = parts.length > 1 ? parts[0].toUpperCase() : '';
    const tableName = parts[parts.length - 1].toUpperCase();
    const body = match[2];

    const columns = [];
    let cur = '';
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      if (char === ',' && depth === 0) {
        if (cur.trim()) processCol(cur.trim(), columns);
        cur = '';
      } else {
        cur += char;
      }
    }
    if (cur.trim()) processCol(cur.trim(), columns);

    function processCol(token, colList) {
      const line = token.replace(/\s+/g, ' ').trim();
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CONSTRAINT|CHECK)\b/i.test(line)) return;
      const colParts = line.split(/\s+/);
      const colName = colParts[0]?.toUpperCase();
      const colType = colParts.slice(1).join(' ').toUpperCase();
      if (colName && /^[A-Z][A-Z0-9_-]*$/.test(colName)) {
        colList.push({ name: colName, type: colType || 'VARCHAR(50)' });
      }
    }

    schemas.push({
      tableName,
      fullName: rawTableName.toUpperCase(),
      schema: schema || '',
      columns,
      declared: true,
      type: 'DB2 Relational Table',
      sourceFile: filename,
      ddl: match[0].trim()
    });
  }

  // Match CREATE INDEX
  const idxRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Z0-9_.]+)\s+ON\s+([A-Z0-9_.]+)\s*\(([\s\S]*?)\)/gi;
  while ((match = idxRegex.exec(content)) !== null) {
    const idxName = match[1].split('.').pop().toUpperCase();
    const targetTbl = match[2].split('.').pop().toUpperCase();
    const cols = match[3].replace(/\s+/g, ' ').trim();
    indexes.push({ name: idxName, table: targetTbl, columns: cols, sourceFile: filename });
  }

  return { schemas, indexes };
}

/**
 * Parse COBOL Copybooks to extract record layouts and typed fields
 */
function extractCopybookRecords(content, filename) {
  const fields = [];
  const lines = content.split(/\r?\n/);
  let recordName = null;

  for (const line of lines) {
    const clean = line.replace(/^\s*\*.*$/, '').replace(/^[0-9]{6}/, '').trim();
    if (!clean) continue;

    const recMatch = clean.match(/^01\s+([A-Z0-9_-]+)/i);
    if (recMatch) {
      const name = recMatch[1].toUpperCase();
      if (!['FILLER', 'WS-', 'CC-WORK-AREAS', 'UNUSED-', 'FUNC-CODES'].some(p => name.startsWith(p))) {
        recordName = name;
      }
      continue;
    }

    const match = clean.match(/^(?:0[2-9]|[1-4][0-9])\s+([A-Z][A-Z0-9_-]*)(?:\s+REDEFINES\s+[A-Z0-9_-]+)?(?:\s+PIC\s+([X9SVZB0-9\(\)\.\,\-+]+))?(?:\s+(?:USAGE\s+IS\s+)?(COMP-[1-5]|COMP|PACKED-DECIMAL|BINARY))?/i);
    if (match) {
      const name = match[1].toUpperCase();
      if (name === 'FILLER') continue;
      const pic = (match[2] || '').toUpperCase();
      const usage = (match[3] || '').toUpperCase();
      let type = 'VARCHAR(50)';
      if (pic.includes('X')) {
        const lenMatch = pic.match(/X\((\d+)\)/);
        const len = lenMatch ? parseInt(lenMatch[1], 10) : (pic.match(/X+/)?.[0]?.length || 1);
        type = len === 1 ? 'CHAR(1)' : ('VARCHAR(' + len + ')');
      } else if (pic.includes('9')) {
        const hasDec = pic.includes('V') || pic.includes('.');
        if (hasDec) {
          type = 'DECIMAL(15,2)';
        } else {
          const digitsMatch = pic.match(/9\((\d+)\)/);
          const digits = digitsMatch ? parseInt(digitsMatch[1], 10) : (pic.match(/9+/)?.[0]?.length || 1);
          type = digits > 9 ? 'BIGINT' : (digits > 4 ? 'INTEGER' : 'SMALLINT');
        }
      }
      fields.push({ name, type, pic: pic + (usage ? ' ' + usage : '') });
    }
  }

  return {
    recordName: recordName || filename.replace(/\.[^/.]+$/, '').toUpperCase(),
    file: filename,
    fields
  };
}

/**
 * Parse IDCAMS DEFINE CLUSTER & DEFINE AIX from JCL
 */
function extractJclClusters(content, filename) {
  const clusters = [];
  const clusterRegex = /DEFINE\s+CLUSTER\s*\(\s*NAME\s*\(\s*([A-Z0-9_.-]+)\s*\)[\s\S]*?(?:KEYS\s*\(\s*(\d+)\s+(\d+)\s*\))?[\s\S]*?(?:RECORDSIZE\s*\(\s*(\d+)\s+(\d+)\s*\))?/gi;
  let m;
  while ((m = clusterRegex.exec(content)) !== null) {
    const dsn = m[1].toUpperCase();
    const tblName = extractTableNameFromDsn(dsn);
    clusters.push({
      tableName: tblName,
      clusterName: dsn,
      dsn,
      sourceFile: filename,
      keyLength: m[2] ? parseInt(m[2], 10) : null,
      recordSize: m[4] ? parseInt(m[4], 10) : null
    });
  }

  const aixRegex = /DEFINE\s+AIX\s*\(\s*NAME\s*\(\s*([A-Z0-9_.-]+)\s*\)[\s\S]*?RELATE\s*\(\s*([A-Z0-9_.-]+)\s*\)/gi;
  while ((m = aixRegex.exec(content)) !== null) {
    const aixDsn = m[1].toUpperCase();
    const baseDsn = m[2].toUpperCase();
    clusters.push({
      tableName: extractTableNameFromDsn(aixDsn),
      clusterName: aixDsn,
      dsn: aixDsn,
      sourceFile: filename,
      isAix: true,
      relatedTable: extractTableNameFromDsn(baseDsn)
    });
  }

  return clusters;
}

/**
 * Extract CICS, Batch COBOL File I/O, and IMS DL/I operations from COBOL programs
 */
function extractCobolFileAndImsOperations(content, filename, programId) {
  const operations = [];

  const literalMap = new Map();
  const litMatches = [...content.matchAll(/(?:01|05|10|77)\s+([A-Z0-9_-]+)[\s\S]*?VALUE\s+['\"]([^'\"]+)['\"]/gi)];
  for (const m of litMatches) {
    literalMap.set(m[1].toUpperCase(), m[2].trim().toUpperCase());
  }

  // 1. CICS operations
  const cicsRegex = /EXEC\s+CICS\s+(READ|WRITE|REWRITE|DELETE|STARTBR|READNEXT|READPREV)\b[\s\S]*?(?:FILE|DATASET)\s*\(\s*['\"]?([A-Z0-9_-]+)['\"]?\s*\)/gi;
  let cm;
  while ((cm = cicsRegex.exec(content)) !== null) {
    const opVerb = cm[1].toUpperCase();
    const rawTarget = cm[2].toUpperCase();
    const resolved = literalMap.get(rawTarget) || rawTarget;
    const canonical = resolveCanonicalTable(resolved);
    operations.push({
      table: canonical,
      rawTarget: resolved,
      operation: opVerb,
      type: 'CICS',
      programId
    });
  }

  // 2. Batch COBOL file operations
  const fileToDd = new Map();
  const selRegex = /SELECT\s+([A-Z0-9_-]+)\s+ASSIGN\s+TO\s+([A-Z0-9_-]+)/gi;
  let sm;
  while ((sm = selRegex.exec(content)) !== null) {
    fileToDd.set(sm[1].toUpperCase(), sm[2].toUpperCase());
  }

  for (const [internalFile, ddName] of fileToDd.entries()) {
    const canonical = resolveCanonicalTable(ddName);
    if (new RegExp('\\bREAD\\s+' + internalFile + '\\b', 'i').test(content)) {
      operations.push({ table: canonical, rawTarget: ddName, operation: 'READ', type: 'BATCH', programId });
    }
    if (new RegExp('\\bWRITE\\s+[A-Z0-9_-]+\\b', 'i').test(content)) {
      operations.push({ table: canonical, rawTarget: ddName, operation: 'WRITE', type: 'BATCH', programId });
    }
    if (new RegExp('\\bREWRITE\\s+[A-Z0-9_-]+\\b', 'i').test(content)) {
      operations.push({ table: canonical, rawTarget: ddName, operation: 'REWRITE', type: 'BATCH', programId });
    }
    if (new RegExp('\\bDELETE\\s+' + internalFile + '\\b', 'i').test(content)) {
      operations.push({ table: canonical, rawTarget: ddName, operation: 'DELETE', type: 'BATCH', programId });
    }
  }

  // 3. IMS DL/I operations
  if (/CALL\s+['\"]CBLTDLI['\"]/i.test(content)) {
    const dliRegex = /CALL\s+['\"]CBLTDLI['\"]\s+USING\s+([A-Z0-9_-]+)\s+([A-Z0-9_-]+)(?:\s+([A-Z0-9_-]+))?(?:\s+([A-Z0-9_-]+))?/gi;
    let dm;
    while ((dm = dliRegex.exec(content)) !== null) {
      const func = (dm[1] || '').toUpperCase();
      const pcb = (dm[2] || '').toUpperCase();
      const ioArea = (dm[3] || '').toUpperCase();
      const ssa = (dm[4] || '').toUpperCase();

      let opVerb = 'READ';
      if (func.includes('ISRT')) opVerb = 'ISRT';
      else if (func.includes('REPL')) opVerb = 'REPL';
      else if (func.includes('DLET')) opVerb = 'DLET';
      else if (func.includes('GU') || func.includes('GN') || func.includes('GH')) opVerb = 'GU';

      const ssaLiteral = ssa && literalMap.get(ssa) ? literalMap.get(ssa) : ssa;
      const targetSegment = ssaLiteral || ioArea || pcb || 'IMS_SEGMENT';
      const canonical = resolveCanonicalTable(targetSegment);

      operations.push({
        table: canonical,
        rawTarget: targetSegment,
        operation: opVerb,
        type: 'IMS',
        programId
      });
    }
  }

  return operations;
}

/**
 * Determine file category (COBOL, COPYBOOK, JCL, OTHER)
 */
function detectFileCategory(filename, content) {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  
  if (['.jcl', '.job', '.cntl', '.proc', '.prc'].includes(ext) || (/^\/\/[A-Z0-9#$@_-]+\s+(?:JOB|EXEC)\b/im.test(content))) {
    return 'JCL';
  }

  if (['.cpy', '.copy', '.inc', '.dcl'].includes(ext)) {
    return 'COPYBOOK';
  }

  if (['.cbl', '.cob', '.pco', '.sqb'].includes(ext) || content.toUpperCase().includes('IDENTIFICATION DIVISION')) {
    return 'COBOL';
  }

  return 'OTHER';
}

/**
 * Parse an individual source file with SME metrics and metadata
 */
export function parseCobolFile(fileInput, optionalContent) {
  // Support both object { name, content, path, sizeBytes, lastModified } and (filename, content)
  const isObj = typeof fileInput === 'object' && fileInput !== null;
  const filename = isObj ? fileInput.name : fileInput;
  const content = isObj ? fileInput.content : optionalContent;
  const filePath = isObj && fileInput.path ? fileInput.path : filename;
  const sizeBytes = isObj && fileInput.sizeBytes ? fileInput.sizeBytes : (new TextEncoder().encode(content).length);
  const lastModified = isObj && fileInput.lastModified ? fileInput.lastModified : new Date().toISOString();

  const lines = preprocessCobol(content);
  const totalLines = lines.length;
  const codeLines = lines.filter(l => !l.isComment && l.code.trim().length > 0).length;
  const commentLines = lines.filter(l => l.isComment).length;

  const category = detectFileCategory(filename, content);
  const isCopybook = category === 'COPYBOOK';
  const isJcl = category === 'JCL';

  const programId = (!isCopybook && !isJcl && category === 'COBOL')
    ? extractProgramId(lines, filename)
    : filename.replace(/\.[^/.]+$/, '').toUpperCase();

  const copybooks = category === 'COBOL' ? extractCopybooks(lines) : [];
  const calls = category === 'COBOL' ? extractCalls(lines) : [];
  const performs = category === 'COBOL' ? extractPerforms(lines) : [];
  const { operations: sqlOps, schemas } = (category === 'COBOL' || category === 'COPYBOOK' || /EXEC\s+SQL/i.test(content)) 
    ? extractSqlStatements(lines) 
    : { operations: [], schemas: [] };

  const ddlData = (filename.toLowerCase().endsWith('.ddl') || filename.toLowerCase().endsWith('.sql') || filename.toLowerCase().endsWith('.dcl') || /CREATE\s+(TABLE|INDEX)/i.test(content))
    ? extractDdlSchemas(content, filename)
    : { schemas: [], indexes: [] };

  const copybookRecord = (category === 'COPYBOOK' || filename.toLowerCase().endsWith('.cpy') || /^01\s+[A-Z0-9_-]+/im.test(content))
    ? extractCopybookRecords(content, filename)
    : null;

  const jclClusters = (isJcl || /DEFINE\s+CLUSTER/i.test(content))
    ? extractJclClusters(content, filename)
    : [];

  const fileImsOps = (category === 'COBOL')
    ? extractCobolFileAndImsOperations(content, filename, programId)
    : [];

  const smeDetails = extractMainframeSmeDetails(lines, content, filename, category);

  return {
    filename,
    path: filePath,
    programId,
    category,
    isCopybook,
    isJcl,
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    lastModified,
    totalLines,
    codeLines,
    commentLines,
    rawContent: content,
    lines,
    copybooks,
    calls,
    performs,
    sqlOps,
    schemas,
    ddlData,
    copybookRecord,
    jclClusters,
    fileImsOps,
    smeDetails
  };
}

/**
 * Build hierarchical folder tree from parsed files
 */
export function buildFileDirectoryTree(parsedFiles) {
  const root = {
    name: 'root',
    path: '',
    isDirectory: true,
    children: [],
    totalFiles: 0,
    totalSizeBytes: 0,
    totalSizeFormatted: '0 B',
    totalLines: 0
  };

  for (const pf of parsedFiles) {
    const rawPath = pf.path || pf.filename;
    const parts = rawPath.replace(/\\/g, '/').split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentSubPath = parts.slice(0, i + 1).join('/');

      if (isFile) {
        current.children.push({
          ...pf,
          name: part,
          path: currentSubPath,
          isDirectory: false
        });
      } else {
        let dirNode = current.children.find(c => c.isDirectory && c.name === part);
        if (!dirNode) {
          dirNode = {
            name: part,
            path: currentSubPath,
            isDirectory: true,
            children: [],
            totalFiles: 0,
            totalSizeBytes: 0,
            totalSizeFormatted: '0 B',
            totalLines: 0
          };
          current.children.push(dirNode);
        }
        current = dirNode;
      }
    }
  }

  // Roll up totals for directories
  function rollUp(node) {
    if (!node.isDirectory) return;
    for (const child of node.children) {
      if (child.isDirectory) {
        rollUp(child);
        node.totalFiles += child.totalFiles;
        node.totalSizeBytes += child.totalSizeBytes;
        node.totalLines += child.totalLines;
      } else {
        node.totalFiles += 1;
        node.totalSizeBytes += (child.sizeBytes || 0);
        node.totalLines += (child.totalLines || 0);
      }
    }
    node.totalSizeFormatted = formatBytes(node.totalSizeBytes);
  }

  rollUp(root);
  return root;
}
/**
 * Generic token and prefix matcher to associate copybook records with database entities.
 * Purely algorithmic: tokenizes identifiers, filters generic COBOL structure noise keywords,
 * and performs exact or prefix/abbreviation matching without any application-specific dictionaries.
 */
function matchEntityTokens(tblName, recName) {
  if (!tblName || !recName) return false;

  const noise = new Set(['RECORD', 'DATA', 'FILE', 'TABLE', 'REC', 'WS', 'COPY', 'LAYOUT', 'INPUT', 'OUTPUT', 'AREA']);

  const tokenize = (str) => {
    return str.toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(t => t.length >= 2 && !noise.has(t));
  };

  const tTokens = tokenize(tblName);
  const rTokens = tokenize(recName);

  if (tTokens.length === 0 || rTokens.length === 0) return false;

  let matches = 0;
  for (const t of tTokens) {
    for (const r of rTokens) {
      if (t === r) {
        matches++;
        break;
      }
      // Check prefix abbreviation (e.g. 3+ char prefix match in either direction)
      const minLen = Math.min(t.length, r.length);
      if (minLen >= 3 && (t.startsWith(r) || r.startsWith(t))) {
        matches++;
        break;
      }
    }
  }

  return matches >= 1 && (matches >= Math.min(tTokens.length, rTokens.length));
}

/**
 * Analyze an entire codebase (array of parsed files)
 */
export function analyzeCodebase(files) {
  const parsedFiles = files.map(f => parseCobolFile(f));

  // Set of known present program IDs and copybook filenames
  const presentPrograms = new Set();
  const presentCopybooks = new Set();
  const fileByProgramId = new Map();
  const fileByCopybookName = new Map();

  for (const pf of parsedFiles) {
    if (pf.category === 'COBOL' && pf.programId) {
      presentPrograms.add(pf.programId);
      fileByProgramId.set(pf.programId, pf);
    }
    const baseName = pf.filename.replace(/\.[^/.]+$/, '').toUpperCase();
    if (pf.category === 'COPYBOOK') {
      presentCopybooks.add(baseName);
      presentCopybooks.add(pf.filename.toUpperCase());
      fileByCopybookName.set(baseName, pf);
    } else if (pf.category === 'COBOL') {
      fileByProgramId.set(baseName, pf);
    }
  }

  // 1. Identify Missing Components
  const missingMap = new Map();

  // A. Check Copybooks
  for (const pf of parsedFiles) {
    for (const cb of pf.copybooks) {
      const cbName = cb.name;
      const isPresent = presentCopybooks.has(cbName) || 
                        presentCopybooks.has(`${cbName}.CPY`) || 
                        presentCopybooks.has(`${cbName}.COB`) || 
                        presentCopybooks.has(`${cbName}.TXT`);

      if (!isPresent) {
        const key = `COPYBOOK:${cbName}`;
        if (!missingMap.has(key)) {
          missingMap.set(key, {
            id: key,
            name: cbName,
            type: cb.type === 'SQL_INCLUDE' ? 'SQL Include / DCLGEN' : 'Copybook',
            callers: [{ program: pf.programId, file: pf.filename, lineNum: cb.lineNum, rawCode: cb.rawCode }],
            severity: 'CRITICAL',
            impact: 'Compilation Failure / Missing Data Layout',
            recommendation: `Provide the ${cbName}.cpy file or synthesize its record layout from referencing host variables.`
          });
        } else {
          missingMap.get(key).callers.push({
            program: pf.programId,
            file: pf.filename,
            lineNum: cb.lineNum,
            rawCode: cb.rawCode
          });
        }
      }
    }
  }

  // B. Check Subprograms / External Program CALLs
  const knownSystemApis = new Set(['CEE3ABD', 'CEE3DMP', 'ILBOABN0', 'DSNTIAR', 'CBLTDLI', 'DFHEIENT', 'DFHEIRET']);

  for (const pf of parsedFiles) {
    for (const call of pf.calls) {
      const target = call.target;
      const isPresent = presentPrograms.has(target) || fileByProgramId.has(target);

      if (!isPresent) {
        const isSystem = knownSystemApis.has(target);
        const key = `PROGRAM:${target}`;
        if (!missingMap.has(key)) {
          missingMap.set(key, {
            id: key,
            name: target,
            type: isSystem ? 'System / Subsystem API' : (call.dynamic ? 'Dynamic Subprogram' : 'External Subprogram'),
            callers: [{ program: pf.programId, file: pf.filename, lineNum: call.lineNum, params: call.params, rawCode: call.rawCode }],
            severity: isSystem ? 'MEDIUM' : 'HIGH',
            impact: isSystem ? 'Mainframe Runtime Environment Dependency' : 'Runtime Unresolved Reference / Missing Business Logic',
            recommendation: isSystem 
              ? `Map to modern equivalent platform service or stub runtime emulator.`
              : `Locate source for ${target}.cbl or expose as a REST/gRPC microservice interface.`
          });
        } else {
          missingMap.get(key).callers.push({
            program: pf.programId,
            file: pf.filename,
            lineNum: call.lineNum,
            params: call.params,
            rawCode: call.rawCode
          });
        }
      }
    }
  }

  // Also check JCL references to missing programs
  for (const pf of parsedFiles) {
    if (pf.category === 'JCL' && pf.smeDetails?.referencedPrograms) {
      for (const pgm of pf.smeDetails.referencedPrograms) {
        const isPresent = presentPrograms.has(pgm) || fileByProgramId.has(pgm);
        if (!isPresent) {
          const key = `PROGRAM:${pgm}`;
          if (!missingMap.has(key)) {
            missingMap.set(key, {
              id: key,
              name: pgm,
              type: 'JCL Batch Step Target',
              callers: [{ program: pf.filename, file: pf.filename, lineNum: 1 }],
              severity: 'HIGH',
              impact: 'Batch JCL Execution Failure (PGM not found)',
              recommendation: `Provide the source or load module for ${pgm}.`
            });
          }
        }
      }
    }
  }

  // 2. Database Schemas & CRUD Matrix
  const globalTableMap = new Map();
  const crudTracker = new Map(); // key: `${program}:${table}` -> { program, table, C, R, U, D, count, accessType }

  function getOrCreateTable(rawName, defaultType = 'Database Entity', sourceFile = '', declared = false) {
    const canonicalName = resolveCanonicalTable(rawName);
    if (!canonicalName) return null;
    if (!globalTableMap.has(canonicalName)) {
      globalTableMap.set(canonicalName, {
        tableName: canonicalName,
        fullName: rawName.toUpperCase(),
        type: defaultType,
        sourceFile: sourceFile || '',
        declared,
        columns: new Map(),
        indexes: [],
        programsAccessing: new Set(),
        operations: new Set(),
        aliases: new Set([rawName.toUpperCase(), canonicalName])
      });
    }
    const t = globalTableMap.get(canonicalName);
    t.aliases.add(rawName.toUpperCase());
    if (declared) t.declared = true;
    if (sourceFile && !t.sourceFile) t.sourceFile = sourceFile;
    if (defaultType && t.type === 'Database Entity') t.type = defaultType;
    return t;
  }

  function recordCrud(program, rawTable, opVerb, accessType = 'SQL') {
    const table = resolveCanonicalTable(rawTable);
    if (!table || !program) return;
    const tblEntry = getOrCreateTable(table);
    if (tblEntry) {
      tblEntry.programsAccessing.add(program);
      tblEntry.operations.add(opVerb);
    }
    const key = `${program}:${table}`;
    if (!crudTracker.has(key)) {
      crudTracker.set(key, { program, table, C: false, R: false, U: false, D: false, count: 0, accessType });
    }
    const c = crudTracker.get(key);
    c.count++;
    if (['INSERT', 'WRITE', 'ISRT'].includes(opVerb)) c.C = true;
    if (['SELECT', 'SELECT_CURSOR', 'READ', 'READNEXT', 'READPREV', 'STARTBR', 'GU', 'GN', 'GHU', 'GHN', 'GNP'].includes(opVerb)) c.R = true;
    if (['UPDATE', 'REWRITE', 'REPL'].includes(opVerb)) c.U = true;
    if (['DELETE', 'DLET'].includes(opVerb)) c.D = true;
  }

  // A. Register DDL Schemas (.ddl, .sql, .dcl)
  for (const pf of parsedFiles) {
    if (pf.ddlData?.schemas?.length) {
      for (const s of pf.ddlData.schemas) {
        const tbl = getOrCreateTable(s.tableName, 'DB2 Relational Table', pf.filename, true);
        tbl.fullName = s.fullName;
        tbl.schema = s.schema || '';
        tbl.rawDdl = s.ddl;
        for (const col of s.columns) {
          tbl.columns.set(col.name, col);
        }
      }
    }
    if (pf.ddlData?.indexes?.length) {
      for (const idx of pf.ddlData.indexes) {
        const tbl = getOrCreateTable(idx.table, 'DB2 Relational Table', pf.filename);
        tbl.indexes.push(idx);
      }
    }
  }

  // B. Register JCL Clusters & VSAM Datasets
  for (const pf of parsedFiles) {
    if (pf.jclClusters?.length) {
      for (const cluster of pf.jclClusters) {
        const tbl = getOrCreateTable(cluster.tableName, cluster.isAix ? 'VSAM Alternate Index (AIX)' : 'VSAM Indexed Table (KSDS)', cluster.sourceFile, true);
        tbl.clusterName = cluster.clusterName;
        if (cluster.keyLength) tbl.keyLength = cluster.keyLength;
        if (cluster.recordSize) tbl.recordSize = cluster.recordSize;
        if (cluster.isAix && cluster.relatedTable) {
          tbl.relatedTable = cluster.relatedTable;
        }
      }
    }
  }

  // C. Gather Copybook Record Fields
  const copybookRecords = new Map();
  for (const pf of parsedFiles) {
    if (pf.copybookRecord && pf.copybookRecord.fields.length > 0) {
      const base = pf.filename.replace(/\.[^/.]+$/, '').toUpperCase();
      const recData = { file: pf.filename, recordName: pf.copybookRecord.recordName, fields: pf.copybookRecord.fields, content: pf.rawContent || '' };
      copybookRecords.set(base, recData);
      if (pf.copybookRecord.recordName) {
        copybookRecords.set(pf.copybookRecord.recordName, recData);
      }
    }
  }

  // D. Register IMS Hierarchical Databases Dynamically from operations & copybooks
  for (const pf of parsedFiles) {
    if (pf.category === 'COBOL' && pf.fileImsOps?.length) {
      for (const op of pf.fileImsOps) {
        if (op.type === 'IMS') {
          getOrCreateTable(op.table, 'IMS Hierarchical Database (DL/I)', pf.filename, true);
        }
      }
    }
    if (pf.category === 'COPYBOOK' || pf.filename.toLowerCase().endsWith('.cpy')) {
      const text = pf.rawContent || '';
      const m = text.match(/IMS\s+SEGMENT\s*-\s*([A-Z0-9\s_-]+)/i);
      if (m) {
        const segTitle = resolveCanonicalTable(m[1].trim().replace(/\s+/g, '-'));
        const tbl = getOrCreateTable(segTitle, 'IMS Hierarchical Database (DL/I)', pf.filename, true);
        if (pf.copybookRecord?.fields) {
          for (const f of pf.copybookRecord.fields) tbl.columns.set(f.name, f);
        }
      }
    }
  }

  // E. Register SQL Operations & Inferred Columns
  for (const pf of parsedFiles) {
    for (const op of pf.sqlOps) {
      for (const tbl of op.tables) {
        recordCrud(pf.programId, tbl, op.operation, 'SQL');
        const tblEntry = getOrCreateTable(tbl);
        for (const col of op.columns) {
          if (!tblEntry.columns.has(col)) {
            tblEntry.columns.set(col, { name: col, type: inferColumnType(col) });
          }
        }
      }
    }

    for (const schema of pf.schemas) {
      if (!schema.declared) continue;
      const tblEntry = getOrCreateTable(schema.name, 'DB2 Relational Table', pf.filename, true);
      for (const col of schema.columns) {
        tblEntry.columns.set(col.name, col);
      }
    }
  }

  // F. Register CICS & Batch COBOL & IMS File Operations
  for (const pf of parsedFiles) {
    if (pf.fileImsOps?.length) {
      for (const op of pf.fileImsOps) {
        recordCrud(pf.programId, op.table, op.operation, op.type);
      }
    }
  }

  // Dynamic discovery of DD -> Copybook associations from COBOL source
  const dynamicDdToCopy = new Map();
  for (const pf of parsedFiles) {
    if (pf.category === 'COBOL') {
      const content = pf.rawContent || '';
      const selMatches = [...content.matchAll(/SELECT\s+([A-Z0-9_-]+)\s+ASSIGN\s+TO\s+([A-Z0-9_-]+)/gi)];
      const internalToDd = new Map();
      for (const sm of selMatches) internalToDd.set(sm[1].toUpperCase(), sm[2].toUpperCase());

      const fdMatches = [...content.matchAll(/FD\s+([A-Z0-9_-]+)[\s\S]*?(?=FD|\s{2,}[A-Z0-9_-]+\s+SECTION|PROCEDURE\s+DIVISION)/gi)];
      for (const fm of fdMatches) {
        const internal = fm[1].toUpperCase();
        const dd = internalToDd.get(internal) || internal;
        const copyMatch = fm[0].match(/COPY\s+([A-Z0-9_-]+)/i);
        if (copyMatch) dynamicDdToCopy.set(dd, copyMatch[1].toUpperCase());
      }

      const cicsMatches = [...content.matchAll(/EXEC\s+CICS\s+(?:READ|WRITE|REWRITE|DELETE)\b[\s\S]*?(?:FILE|DATASET)\s*\(\s*['\"]?([A-Z0-9_-]+)['\"]?\s*\)[\s\S]*?INTO\s*\(\s*([A-Z0-9_-]+)\s*\)/gi)];
      for (const cm of cicsMatches) {
        const file = cm[1].toUpperCase();
        const into = cm[2].toUpperCase();
        const copyRegex = new RegExp('(?:01|05)\\s+' + into + '[\\s\\S]*?COPY\\s+([A-Z0-9_-]+)', 'i');
        const copyMatch = content.match(copyRegex);
        if (copyMatch) dynamicDdToCopy.set(file, copyMatch[1].toUpperCase());
      }
    }
  }

  // G. Associate Copybook Fields with All Identified Tables Dynamically
  for (const [tblName, tblEntry] of globalTableMap.entries()) {
    if (tblEntry.columns.size === 0 || tblEntry.columns.size === 1) {
      let matchedFields = null;
      let sourceFile = null;

      // 1. Match via dynamically discovered DD -> Copybook
      for (const [dd, cbName] of dynamicDdToCopy.entries()) {
        const canon = resolveCanonicalTable(dd);
        if (canon === tblName || dd === tblName) {
          if (copybookRecords.has(cbName)) {
            const cbData = copybookRecords.get(cbName);
            matchedFields = cbData.fields;
            sourceFile = cbData.file;
            break;
          }
        }
      }

      // 2. Match via generic COBOL Record Names
      if (!matchedFields) {
        for (const [cbKey, cbData] of copybookRecords.entries()) {
          const rec = cbData.recordName || '';
          if (!rec) continue;
          if (matchEntityTokens(tblName, rec)) {
            matchedFields = cbData.fields;
            sourceFile = cbData.file;
            break;
          }
        }
      }

      // 3. Fallback: match by substring
      if (!matchedFields) {
        for (const [cbKey, cbData] of copybookRecords.entries()) {
          if (cbKey.includes(tblName) || tblName.includes(cbKey)) {
            matchedFields = cbData.fields;
            sourceFile = cbData.file;
            break;
          }
        }
      }

      if (matchedFields) {
        if (sourceFile && !tblEntry.sourceFile) tblEntry.sourceFile = sourceFile;
        tblEntry.declared = true;
        if (tblEntry.type === 'Database Entity') {
          tblEntry.type = 'VSAM Dataset Table';
        }
        for (const f of matchedFields) {
          tblEntry.columns.set(f.name, f);
        }
      }
    }
  }

  // H. Generate Modern DDL & Schemas Output
  const databaseSchemas = Array.from(globalTableMap.values()).map(tbl => {
    const colsArray = Array.from(tbl.columns.values());
    if (colsArray.length === 0) {
      colsArray.push({ name: `${tbl.tableName}_ID`, type: 'BIGINT NOT NULL PRIMARY KEY' });
    }

    const ddl = `CREATE TABLE ${tbl.fullName || tbl.tableName} (\n` +
      colsArray.map((c, i) => `    ${c.name.padEnd(25)} ${c.type}${i === 0 && !c.type.includes('KEY') ? ' PRIMARY KEY' : ''}`).join(',\n') +
      `\n);`;

    return {
      tableName: tbl.tableName,
      fullName: tbl.fullName || tbl.tableName,
      type: tbl.type || (tbl.declared ? 'DB2 Relational Table' : 'Inferred Database Entity'),
      schema: tbl.schema || '',
      sourceFile: tbl.sourceFile || '',
      indexes: tbl.indexes || [],
      aliases: Array.from(tbl.aliases || []),
      columns: colsArray,
      declared: tbl.declared,
      programsAccessing: Array.from(tbl.programsAccessing),
      operations: Array.from(tbl.operations),
      ddl
    };
  });

  // I. Build CRUD Matrix Array
  const crudMatrix = Array.from(crudTracker.values());

  for (const schema of databaseSchemas) {
    if (!schema.declared && schema.operations.some(op => op !== 'UNKNOWN')) {
      const key = `TABLE:${schema.tableName}`;
      missingMap.set(key, {
        id: key,
        name: schema.tableName,
        type: 'Database Table / DCLGEN',
        callers: schema.programsAccessing.map(p => ({ program: p, file: fileByProgramId.get(p)?.filename || p, lineNum: 1 })),
        severity: 'MEDIUM',
        impact: 'Undeclared SQL Entity / Implicit Schema',
        recommendation: `Generate DDL schema using the inferred structure and verify DB2 catalog metadata.`
      });
    }
  }

  const allMissingList = Array.from(missingMap.values());

  // 3. Build Application Flows (Call Graph & Hierarchy Tree)
  const graphNodes = [];
  const graphEdges = [];
  const nodeMap = new Map();

  for (const pf of parsedFiles) {
    if (pf.category !== 'COBOL') continue;
    const nodeId = pf.programId;
    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        id: nodeId,
        label: nodeId,
        title: `Program: ${nodeId} (${pf.codeLines} LOC)\nFile: ${pf.filename}`,
        shape: 'box',
        shapeProperties: { borderRadius: 6 },
        borderWidth: 2,
        isMissing: false,
        type: 'program',
        file: pf.filename,
        loc: pf.codeLines,
        inDegree: 0,
        outDegree: 0
      });
    }
  }

  for (const missing of allMissingList) {
    if (missing.type.includes('Subprogram') || missing.type.includes('API') || missing.type.includes('Batch Step')) {
      const nodeId = missing.name;
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          label: `[!] ${nodeId}`,
          title: `MISSING COMPONENT: ${nodeId}\nSeverity: ${missing.severity}\nCalled by: ${missing.callers.map(c => c.program).join(', ')}`,
          shape: 'box',
          shapeProperties: { borderRadius: 6, borderDashes: [5, 5] },
          borderWidth: 2,
          isMissing: true,
          type: 'missing_program',
          severity: missing.severity,
          inDegree: 0,
          outDegree: 0
        });
      }
    }
  }

  const edgeSet = new Set();
  for (const pf of parsedFiles) {
    if (pf.category !== 'COBOL') continue;
    const callerId = pf.programId;

    for (const call of pf.calls) {
      const calleeId = call.target;
      const edgeKey = `${callerId}->${calleeId}`;

      if (nodeMap.has(callerId)) nodeMap.get(callerId).outDegree++;
      if (nodeMap.has(calleeId)) nodeMap.get(calleeId).inDegree++;

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        const isMissingTarget = !presentPrograms.has(calleeId);
        graphEdges.push({
          id: edgeKey,
          from: callerId,
          to: calleeId,
          arrows: 'to',
          label: call.params && call.params.length > 0 ? `USING (${call.params.length})` : '',
          color: {
            color: isMissingTarget ? '#F43F5E' : '#38BDF8',
            highlight: '#FBBF24'
          },
          dashes: isMissingTarget,
          width: isMissingTarget ? 2 : 1.5,
          font: { size: 10, color: '#94A3B8', face: 'JetBrains Mono' }
        });
      }
    }
  }

  const nodesList = Array.from(nodeMap.values());
  const entryPoints = nodesList.filter(n => !n.isMissing && n.inDegree === 0).map(n => n.id);

  const buildCallTree = (progId, visited = new Set(), depth = 0) => {
    if (depth > 12) return { name: progId, note: 'Max depth reached', children: [] };
    const isCycle = visited.has(progId);
    const newVisited = new Set(visited);
    newVisited.add(progId);

    const pf = fileByProgramId.get(progId);
    const outCalls = pf ? pf.calls.map(c => c.target) : [];
    const uniqueCallees = [...new Set(outCalls)];

    const children = isCycle ? [] : uniqueCallees.map(callee => buildCallTree(callee, newVisited, depth + 1));

    return {
      name: progId,
      isMissing: !presentPrograms.has(progId),
      isCycle,
      depth,
      callsCount: uniqueCallees.length,
      children
    };
  };

  const callTrees = (entryPoints.length > 0 ? entryPoints : nodesList.filter(n => !n.isMissing).slice(0, 3).map(n => n.id))
    .map(ep => buildCallTree(ep));

  // 4. File Inventory, Extension-Wise Breakdown & Tree Structure (lines 12-20)
  const categoryStats = {
    cobol: { count: 0, totalLines: 0, codeLines: 0, commentLines: 0, sizeBytes: 0, paragraphsCount: 0, sectionsCount: 0 },
    copybook: { count: 0, totalLines: 0, codeLines: 0, commentLines: 0, sizeBytes: 0 },
    jcl: { count: 0, totalLines: 0, codeLines: 0, commentLines: 0, sizeBytes: 0, stepsCount: 0 },
    other: { count: 0, totalLines: 0, codeLines: 0, commentLines: 0, sizeBytes: 0 }
  };

  const extMap = new Map();

  for (const pf of parsedFiles) {
    const ext = pf.filename.substring(pf.filename.lastIndexOf('.')).toLowerCase() || '.unknown';
    const cat = pf.category.toLowerCase();

    if (categoryStats[cat]) {
      categoryStats[cat].count++;
      categoryStats[cat].totalLines += pf.totalLines;
      categoryStats[cat].codeLines += pf.codeLines;
      categoryStats[cat].commentLines += pf.commentLines;
      categoryStats[cat].sizeBytes += pf.sizeBytes;
      if (cat === 'cobol') {
        categoryStats.cobol.paragraphsCount += (pf.smeDetails?.paragraphsCount || 0);
        categoryStats.cobol.sectionsCount += (pf.smeDetails?.sectionsCount || 0);
      } else if (cat === 'jcl') {
        categoryStats.jcl.stepsCount += (pf.smeDetails?.stepsCount || 0);
      }
    }

    if (!extMap.has(ext)) {
      extMap.set(ext, {
        extension: ext,
        category: pf.category,
        count: 0,
        totalLines: 0,
        codeLines: 0,
        commentLines: 0,
        sizeBytes: 0
      });
    }

    const extEntry = extMap.get(ext);
    extEntry.count++;
    extEntry.totalLines += pf.totalLines;
    extEntry.codeLines += pf.codeLines;
    extEntry.commentLines += pf.commentLines;
    extEntry.sizeBytes += pf.sizeBytes;
  }

  // Format category stats with human readable sizes
  for (const key of Object.keys(categoryStats)) {
    categoryStats[key].sizeFormatted = formatBytes(categoryStats[key].sizeBytes);
  }

  const totalSizeBytes = parsedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
  const totalLoc = parsedFiles.reduce((acc, f) => acc + f.codeLines, 0);
  const totalLines = parsedFiles.reduce((acc, f) => acc + f.totalLines, 0);

  const extensionBreakdown = Array.from(extMap.values()).map(e => ({
    ...e,
    sizeFormatted: formatBytes(e.sizeBytes),
    percentageOfCodebase: totalLines > 0 ? Math.round((e.totalLines / totalLines) * 100) : 0
  })).sort((a, b) => b.totalLines - a.totalLines);

  const directoryTree = buildFileDirectoryTree(parsedFiles);

  const fileInventory = {
    totalFiles: parsedFiles.length,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    totalLines,
    totalCodeLines: totalLoc,
    totalCommentLines: parsedFiles.reduce((acc, f) => acc + f.commentLines, 0),
    categories: categoryStats,
    extensionBreakdown,
    tree: directoryTree
  };

  const totalCalls = parsedFiles.reduce((acc, f) => acc + f.calls.length, 0);
  const totalCopybookRefs = parsedFiles.reduce((acc, f) => acc + f.copybooks.length, 0);
  const totalMissing = allMissingList.length;
  const criticalMissing = allMissingList.filter(m => m.severity === 'CRITICAL').length;
  const resolvedRate = Math.max(0, Math.min(100, Math.round(((parsedFiles.length) / (parsedFiles.length + totalMissing)) * 100)));

  return {
    parsedFiles,
    missingComponents: allMissingList,
    databaseSchemas,
    crudMatrix,
    graph: {
      nodes: nodesList,
      edges: graphEdges,
      entryPoints
    },
    callTrees,
    fileInventory,
    metrics: {
      totalFiles: parsedFiles.length,
      totalPrograms: presentPrograms.size,
      totalCopybooks: presentCopybooks.size,
      totalJclFiles: categoryStats.jcl.count,
      totalOtherFiles: categoryStats.other.count,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      totalLoc,
      totalLines,
      totalCalls,
      totalCopybookRefs,
      totalDbTables: databaseSchemas.length,
      totalMissing,
      criticalMissing,
      resolvedRate,
      categoryStats
    }
  };
}
