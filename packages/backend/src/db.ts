// oracle-pool.ts (에러 수정 완료)
import oracledb from 'oracledb';
import { NavItem, NavSubItem, ColDesc, WorkoutRecord, WorkoutSummary, WorkoutSummarySub } from 'shared';
import dotenv from 'dotenv';
import Logger from './logger.js'

// 환경 변수 로드
dotenv.config();

const DB_CONFIG = {
  user: process.env.DB_USER,
  password: process.env.DB_USER_PASSWORD,
  connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE_NAME}`,
  poolMin: 1,
  poolMax: 10,
  poolIncrement: 1
};

let pool: any = null;

export async function initPool(): Promise<void> {
  if (pool) return;
  try {
    pool = await oracledb.createPool(DB_CONFIG);
    console.log('DB풀을 생성하였습니다.');
    await Logger.log('i', 'DB풀 생성 성공');
  } catch (error) {
    console.log('DB풀을 생성하지 못했습니다.', (error as Error).message || error);
    await Logger.logError('DB풀 생성 실패', (error as Error).message || error);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  try {
    await pool.close(5000); // 5초 내 정리
    console.log('DB풀을 종료하였습니다.');
    await Logger.log('i', 'DB풀 종료 성공');
  } catch (error) {
    console.log('DB풀을 종료하지 못했습니다.', (error as Error).message || error);
    await Logger.logError('DB풀 종료 실패', (error as Error).message || error);
    throw error;
  }
}

/**
 * 쿼리 실행 (SELECT) - 수정됨!
 */
async function select(sql: string, binds: any[] = []): Promise<any[]> {
  let logEntry = null;
  let connection = null;
  try {
    // 1. 쿼리 시작 로그
    await initPool();
    connection = await pool!.getConnection();    
    logEntry = await Logger.logQueryStart(sql, binds);
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    // 2. 성공 로그
    await Logger.logQuerySuccess(logEntry, result.rows.length)    
    return result.rows as any[];
  } catch (error) {
    // 3. 에러 로그
    await Logger.logQueryError(logEntry, error)
    throw error
  } finally {
    if (connection) 
      await connection.close();
  }
}
/**
 * 쿼리 실행 (PL/SQL) - 수정됨!
 */
async function execPlsql(sql: string, binds: Record<string, any>, options: any = {}): Promise<any> {
  let logEntry = null;
  let connection = null;
  try {
    // 1. 쿼리 시작 로그
    await initPool();
    connection = await pool!.getConnection();    
    logEntry = await Logger.logQueryStart(sql, binds);

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...options
    });
    // 2. 성공 로그
    await Logger.logQuerySuccess(logEntry, result.rowsAffected || 0);
    // JSON CLOB 자동 처리
    if (result.outBinds?.json) {
      const clob = result.outBinds.json as oracledb.Lob;      
      const jsonData = await clob.getData();
      const jsonString = typeof jsonData === 'string' ? jsonData : jsonData.toString();
      return JSON.parse(jsonString);
    }
    return result.outBinds || result.rows || [];
  } catch (error) {
    // 3. 에러 로그
    console.log('Executing PL/SQL with binds: 실패', '에러:', (error as Error).message || error);
    await Logger.logQueryError(logEntry, error)
    throw error
  } finally {
    if (connection) 
      await connection.close();
  }
}

/**
 * INSERT/UPDATE/DELETE (DML)
 */
async function execute(sql: string, binds: any[] = []): Promise<any> {
  let logEntry = null;
  let connection = null;  
  try {
    await initPool();
    connection = await pool!.getConnection();
    logEntry = await Logger.logQueryStart(sql, binds);
    const result = await connection.execute(sql, binds, {
      autoCommit: true,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    await Logger.logQuerySuccess(logEntry, result.rowsAffected || 0);
    return result;
  } catch (error) {
    // 3. 에러 로그
    await Logger.logQueryError(logEntry, error)
    throw error
  } finally {    
    if (connection) 
      await connection.close();
  }
}

// =================================================================================================================
// DB에서 데이터를 조회하여 반환하는 함수들 (원시 데이터 조회)
// =================================================================================================================
// 1. 메뉴 조회 - 메뉴와 서브메뉴를 각각 조회한 후, 자바스크립트에서 조합하여 반환
async function getRawMenus(): Promise<any[]> {
  return select(`
SELECT  id, 
        title, img, description 
FROM    nav_item
`);
}
async function getRawSubMenus(title: string = ''): Promise<any[]> {
  return select(`
SELECT  nav_item_id || '-' || id AS id, 
        title, href, description 
FROM    nav_sub_item
WHERE   title LIKE '%' || :title || '%'
ORDER BY nav_item_id, id
`, [title]);
}
async function searchRawSubMenus(key: string = ''): Promise<any[]> {
  if (!key?.trim() || key.trim().length < 2) {
    return [];  
  }
  const cleanKey = key.trim();
  return select(`
SELECT  nav_item_id || '-' || id AS id, 
        title, href, description 
FROM    nav_sub_item
WHERE   title LIKE '%' || UPPER(:1) || '%' OR description LIKE '%' || UPPER(:2) || '%'
ORDER BY nav_item_id, id
`, [cleanKey, cleanKey]);
}
// 2. 칼럼정의 조회 - 테이블명으로 칼럼정의 조회 (칼럼명은 소문자로 반환)
async function getRawColDescs(tableName: string): Promise<any[]> {
  return select(`
SELECT  Lower(id) AS id,  -- 중요함: 칼럼명을 소문자로 변환하여 반환
        title,
        type,
        width,
        summary
FROM    column_desc
WHERE   table_name = :tableName
ORDER BY seq
`, [tableName]);
}
// 3 운동내역 조회 
async function getRawWorkoutRecords(memberId: string): Promise<any[]> {
  return select(`
SELECT  A.id || '-' || B.workout_id AS id,
        A.wo_dt,
        C.title,
        MOD(TO_NUMBER(SUBSTR(B.workout_id, 2)) -1, 5) title_color, 
        B.target_reps,
        B.target_sets,
        B.reps,
        B.point,
        A.description
FROM    workout_record A
JOIN    workout_detail B ON B.workout_record_id = A.id 
JOIN    workout C ON C.id = B.workout_id
WHERE   A.member_id = :1
`, [memberId]);
}
async function getRawWorkoutPivot(memberId: string, from: string, to: string): Promise<any> {
  const binds = {
    memberId,
    from,
    to,
    json: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
  };
  return execPlsql(`
DECLARE
  v_json CLOB;
BEGIN
  get_workout_pivot_json(:memberId, TO_DATE(:from, 'YYYY-MM-DD'), TO_DATE(:to, 'YYYY-MM-DD'), v_json);
  :json := v_json;  
END;
`, binds);
}

// =================================================================================================================
// DB에서 읽어들인 데이터를 객체 데이터로 변환하여 반환하는 함수들
// =================================================================================================================
// 2. 메뉴 조회 
export const getMenus = async (title: string = ''): Promise<NavItem[]> => {
  const menus = await getRawMenus();
  const subMenus = await getRawSubMenus(title);
  
  // 메뉴 맵 생성
  const menuMap = new Map<string, NavItem>();
  
  // 1단계: 메뉴 객체 생성
  menus.forEach((menu: any) => {
    const navItem: NavItem = {
      id: menu.ID,
      title: menu.TITLE || '',
      img: menu.IMG || '',
      description: menu.DESCRIPTION || '',
      sub_menus: []
    };
    menuMap.set(navItem.id, navItem);
  });
  
  // 2단계: 서브메뉴 연결 (1-1 → id="1"에 추가)
  subMenus.forEach((sub: any) => {
    const parentId = sub.ID.split('-')[0]; // "1-1" → "1"
    const parentMenu = menuMap.get(parentId);
    
    if (parentMenu) {
      parentMenu.sub_menus.push({
        id: sub.ID,
        title: sub.TITLE || '',
        href: sub.HREF || '',
        description: sub.DESCRIPTION || ''
      });
    }
  });
  
  return Array.from(menuMap.values());
}
// 3. 메뉴 검색
export const searchSubMenus = async (key: string = ''): Promise<NavSubItem[]> => {
  const subMenus = await searchRawSubMenus(key);
  return subMenus.map((sub: any) => ({
    id: sub.ID,
    title: sub.TITLE,
    href: sub.HREF,
    description: sub.DESCRIPTION
  }));
}
// 4. Column Description 조회
export const getColDescs = async (tableName: string): Promise<ColDesc[]> => {
  const colDescs = await getRawColDescs(tableName);
  return colDescs.map((col: any) => ({      
    id: col.ID,
    title: col.TITLE,     
    type: col.TYPE,
    width: col.WIDTH,
    summary: col.SUMMARY,
    aggregate: 0
  }));
} 
// 5. 운동내역 조회
export const getWorkoutRecords = async (memberId: string): Promise<WorkoutRecord[]> => {
  const records = await getRawWorkoutRecords(memberId);
  return records.map((rec: any) => ({
    id: rec.ID,
    wo_dt: rec.WO_DT,
    title: rec.TITLE,
    title_color: rec.TITLE_COLOR,
    target_reps: rec.TARGET_REPS,
    target_sets: rec.TARGET_SETS,
    reps: rec.REPS,
    point: rec.POINT,
    description: rec.DESCRIPTION
  }));
}
// 6. 운동내역 피벗 조회
export const getWorkoutPivot = async (memberId: string, from: string, to: string): Promise<any> => {
  const result = await getRawWorkoutPivot(memberId, from, to);
  return result;
}
function pivotJsonToWorkoutSummary(pivotData: any[]): WorkoutSummary[] {
  // 1. 모든 운동 ID 수집
  const workoutIds = new Set<string>();
  pivotData.forEach(day => {
    Object.keys(day.workouts || {}).forEach(id => {
      if (id.endsWith('_reps')) {
        workoutIds.add(id.replace('_reps', ''));
      }
    });
  });

  // 2. 각 운동별 WorkoutSummary 생성
  return Array.from(workoutIds).map(cate => {
    const values: WorkoutSummarySub[] = pivotData.map(day => ({
      reps: (day.workouts as any)[`${cate}_reps`] || 0
    }));
    
    return {
      cate,
      values
    };
  });
}