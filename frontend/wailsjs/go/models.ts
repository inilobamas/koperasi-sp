export namespace services {
	
	export class APIResponse {
	    success: boolean;
	    message?: string;
	    data?: any;
	
	    static createFrom(source: any = {}) {
	        return new APIResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.data = source["data"];
	    }
	}
	export class AuditLogListRequest {
	    page: number;
	    limit: number;
	    user_id: string;
	    entity: string;
	    entity_id: string;
	    action: string;
	    date_from: string;
	    date_to: string;
	
	    static createFrom(source: any = {}) {
	        return new AuditLogListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.limit = source["limit"];
	        this.user_id = source["user_id"];
	        this.entity = source["entity"];
	        this.entity_id = source["entity_id"];
	        this.action = source["action"];
	        this.date_from = source["date_from"];
	        this.date_to = source["date_to"];
	    }
	}
	export class AuditLogRequest {
	    user_id?: string;
	    action: string;
	    entity: string;
	    entity_id: string;
	    before: any;
	    after: any;
	    ip_address: string;
	    user_agent: string;
	
	    static createFrom(source: any = {}) {
	        return new AuditLogRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user_id = source["user_id"];
	        this.action = source["action"];
	        this.entity = source["entity"];
	        this.entity_id = source["entity_id"];
	        this.before = source["before"];
	        this.after = source["after"];
	        this.ip_address = source["ip_address"];
	        this.user_agent = source["user_agent"];
	    }
	}
	export class CustomerCreateRequest {
	    nik: string;
	    name: string;
	    email: string;
	    phone: string;
	    // Go type: time
	    date_of_birth: any;
	    address: string;
	    city: string;
	    province: string;
	    postal_code: string;
	    occupation: string;
	    monthly_income: number;
	    referral_code: string;
	
	    static createFrom(source: any = {}) {
	        return new CustomerCreateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nik = source["nik"];
	        this.name = source["name"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.date_of_birth = this.convertValues(source["date_of_birth"], null);
	        this.address = source["address"];
	        this.city = source["city"];
	        this.province = source["province"];
	        this.postal_code = source["postal_code"];
	        this.occupation = source["occupation"];
	        this.monthly_income = source["monthly_income"];
	        this.referral_code = source["referral_code"];
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
	export class CustomerListRequest {
	    page: number;
	    limit: number;
	    search: string;
	    status: string;
	    verified?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CustomerListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.limit = source["limit"];
	        this.search = source["search"];
	        this.status = source["status"];
	        this.verified = source["verified"];
	    }
	}
	export class CustomerUpdateRequest {
	    name: string;
	    email: string;
	    phone: string;
	    // Go type: time
	    date_of_birth: any;
	    address: string;
	    city: string;
	    province: string;
	    postal_code: string;
	    occupation: string;
	    monthly_income: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new CustomerUpdateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.date_of_birth = this.convertValues(source["date_of_birth"], null);
	        this.address = source["address"];
	        this.city = source["city"];
	        this.province = source["province"];
	        this.postal_code = source["postal_code"];
	        this.occupation = source["occupation"];
	        this.monthly_income = source["monthly_income"];
	        this.status = source["status"];
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
	export class DocumentListRequest {
	    page: number;
	    limit: number;
	    customer_id: string;
	    type: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new DocumentListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.limit = source["limit"];
	        this.customer_id = source["customer_id"];
	        this.type = source["type"];
	        this.status = source["status"];
	    }
	}
	export class DocumentVerifyRequest {
	    document_id: string;
	    verifier_id: string;
	    status: string;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new DocumentVerifyRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.document_id = source["document_id"];
	        this.verifier_id = source["verifier_id"];
	        this.status = source["status"];
	        this.notes = source["notes"];
	    }
	}
	export class InstallmentPaymentRequest {
	    installment_id: string;
	    amount: number;
	    // Go type: time
	    payment_date: any;
	
	    static createFrom(source: any = {}) {
	        return new InstallmentPaymentRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.installment_id = source["installment_id"];
	        this.amount = source["amount"];
	        this.payment_date = this.convertValues(source["payment_date"], null);
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
	export class LoanCreateRequest {
	    customer_id: string;
	    amount: number;
	    interest_rate: number;
	    term: number;
	
	    static createFrom(source: any = {}) {
	        return new LoanCreateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customer_id = source["customer_id"];
	        this.amount = source["amount"];
	        this.interest_rate = source["interest_rate"];
	        this.term = source["term"];
	    }
	}
	export class LoanListRequest {
	    page: number;
	    limit: number;
	    customer_id: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new LoanListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.limit = source["limit"];
	        this.customer_id = source["customer_id"];
	        this.status = source["status"];
	    }
	}
	export class LoanUpdateRequest {
	    amount: number;
	    interest_rate: number;
	    term: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new LoanUpdateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.amount = source["amount"];
	        this.interest_rate = source["interest_rate"];
	        this.term = source["term"];
	        this.status = source["status"];
	    }
	}
	export class NotificationTestRequest {
	    type: string;
	    recipient: string;
	    subject: string;
	    body: string;
	
	    static createFrom(source: any = {}) {
	        return new NotificationTestRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.recipient = source["recipient"];
	        this.subject = source["subject"];
	        this.body = source["body"];
	    }
	}
	export class ReferralCodeCreateRequest {
	    owner_user_id: string;
	    quota: number;
	    // Go type: time
	    expires_at?: any;
	
	    static createFrom(source: any = {}) {
	        return new ReferralCodeCreateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.owner_user_id = source["owner_user_id"];
	        this.quota = source["quota"];
	        this.expires_at = this.convertValues(source["expires_at"], null);
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
	export class ReferralCodeListRequest {
	    page: number;
	    limit: number;
	    owner_user_id: string;
	    active?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ReferralCodeListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.limit = source["limit"];
	        this.owner_user_id = source["owner_user_id"];
	        this.active = source["active"];
	    }
	}
	export class ReferralCodeUpdateRequest {
	    quota: number;
	    active: boolean;
	    // Go type: time
	    expires_at?: any;
	
	    static createFrom(source: any = {}) {
	        return new ReferralCodeUpdateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.quota = source["quota"];
	        this.active = source["active"];
	        this.expires_at = this.convertValues(source["expires_at"], null);
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
	export class SendNotificationRequest {
	    installment_id: string;
	    template_id: string;
	    type: string;
	    recipient: string;
	    // Go type: time
	    scheduled_for: any;
	
	    static createFrom(source: any = {}) {
	        return new SendNotificationRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.installment_id = source["installment_id"];
	        this.template_id = source["template_id"];
	        this.type = source["type"];
	        this.recipient = source["recipient"];
	        this.scheduled_for = this.convertValues(source["scheduled_for"], null);
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
	export class LoginRequest {
	    email: string;
	    password: string;

	    static createFrom(source: any = {}) {
	        return new LoginRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.email = source["email"];
	        this.password = source["password"];
	    }
	}
	export class UserCreateRequest {
	    name: string;
	    email: string;
	    password: string;
	    role: string;

	    static createFrom(source: any = {}) {
	        return new UserCreateRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	        this.password = source["password"];
	        this.role = source["role"];
	    }
	}
	export class UserUpdateRequest {
	    name: string;
	    email: string;
	    role: string;

	    static createFrom(source: any = {}) {
	        return new UserUpdateRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	        this.role = source["role"];
	    }
	}
	export class UserListRequest {
	    page: number;
	    limit: number;
	    search: string;
	    role: string;

	    static createFrom(source: any = {}) {
	        return new UserListRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.limit = source["limit"];
	        this.search = source["search"];
	        this.role = source["role"];
	    }
	}
	export class ChangePasswordRequest {
	    user_id: string;
	    current_password: string;
	    new_password: string;

	    static createFrom(source: any = {}) {
	        return new ChangePasswordRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user_id = source["user_id"];
	        this.current_password = source["current_password"];
	        this.new_password = source["new_password"];
	    }
	}

}

