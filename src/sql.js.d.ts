declare module 'sql.js' {
    export interface Database {
        run(sql: string, params?: any[]): void;
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
    }

    export interface Statement {
        bind(params?: any[]): void;
        step(): boolean;
        getAsObject(): any;
        free(): void;
    }

    export interface SqlJsStatic {
        Database: new (data?: ArrayLike<number> | Buffer) => Database;
    }

    export interface InitSqlJsOptions {
        locateFile?: (file: string) => string;
    }

    export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
