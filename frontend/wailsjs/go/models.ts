export namespace models {
	
	export class AppSettings {
	    theme: string;
	    accent: string;
	    default_period: string;
	    currency: string;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.accent = source["accent"];
	        this.default_period = source["default_period"];
	        this.currency = source["currency"];
	    }
	}
	export class CategoryBreakdownResponse {
	    category_id: number;
	    category_name: string;
	    category_type: string;
	    total: number;
	    transaction_count: number;
	
	    static createFrom(source: any = {}) {
	        return new CategoryBreakdownResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.category_id = source["category_id"];
	        this.category_name = source["category_name"];
	        this.category_type = source["category_type"];
	        this.total = source["total"];
	        this.transaction_count = source["transaction_count"];
	    }
	}
	export class CategoryResponse {
	    id: number;
	    name: string;
	    type: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new CategoryResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.created_at = source["created_at"];
	    }
	}
	export class CreateCategoryRequest {
	    name: string;
	    type: string;
	
	    static createFrom(source: any = {}) {
	        return new CreateCategoryRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	    }
	}
	export class CreateTransactionRequest {
	    category_id: number;
	    description: string;
	    amount: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateTransactionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.category_id = source["category_id"];
	        this.description = source["description"];
	        this.amount = source["amount"];
	    }
	}
	export class TransactionResponse {
	    id: number;
	    category_id: number;
	    description: string;
	    amount: number;
	    transaction_date: string;
	    category_name: string;
	    category_type: string;
	
	    static createFrom(source: any = {}) {
	        return new TransactionResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.category_id = source["category_id"];
	        this.description = source["description"];
	        this.amount = source["amount"];
	        this.transaction_date = source["transaction_date"];
	        this.category_name = source["category_name"];
	        this.category_type = source["category_type"];
	    }
	}
	export class DashboardData {
	    total_income: number;
	    total_expense: number;
	    net_balance: number;
	    category_breakdown: CategoryBreakdownResponse[];
	    recent_transactions: TransactionResponse[];
	
	    static createFrom(source: any = {}) {
	        return new DashboardData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_income = source["total_income"];
	        this.total_expense = source["total_expense"];
	        this.net_balance = source["net_balance"];
	        this.category_breakdown = this.convertValues(source["category_breakdown"], CategoryBreakdownResponse);
	        this.recent_transactions = this.convertValues(source["recent_transactions"], TransactionResponse);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EditCategoryRequest {
	    name: string;
	    type: string;
	    id: number;
	
	    static createFrom(source: any = {}) {
	        return new EditCategoryRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.id = source["id"];
	    }
	}
	export class EditTransactionRequest {
	    description: string;
	    amount: number;
	    id: number;
	
	    static createFrom(source: any = {}) {
	        return new EditTransactionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.description = source["description"];
	        this.amount = source["amount"];
	        this.id = source["id"];
	    }
	}
	export class PaginatedTransactions {
	    transactions: TransactionResponse[];
	    total: number;
	    page: number;
	    page_size: number;
	
	    static createFrom(source: any = {}) {
	        return new PaginatedTransactions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.transactions = this.convertValues(source["transactions"], TransactionResponse);
	        this.total = source["total"];
	        this.page = source["page"];
	        this.page_size = source["page_size"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SystemInfo {
	    database_path: string;
	    engine: string;
	    runtime: string;
	    migrations: string[];
	    categories_count: number;
	    transactions_count: number;
	    settings_count: number;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.database_path = source["database_path"];
	        this.engine = source["engine"];
	        this.runtime = source["runtime"];
	        this.migrations = source["migrations"];
	        this.categories_count = source["categories_count"];
	        this.transactions_count = source["transactions_count"];
	        this.settings_count = source["settings_count"];
	    }
	}

}

