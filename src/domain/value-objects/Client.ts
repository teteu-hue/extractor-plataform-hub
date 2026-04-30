import { ClientProps } from "./ClientProps";
import { InvalidClientError } from "../errors/DomainError";

export class Client {
    private readonly _name: string;
    private readonly _phone: string;
    private readonly _email: string;

    private constructor(props: ClientProps) {
        this._name = props.name;
        this._phone = props.phone;
        this._email = props.email;
    }

    static create(props: ClientProps): Client {
        const [valid, error] = this._validate(props);
        if (!valid) {
            throw new InvalidClientError(error!);
        }

        return new Client(props);
    }

    private static _validate(props: ClientProps): [boolean, string | null] {
        const requiredFields: [keyof ClientProps, string][] = Client._requiredFields();

        for (const [field, label] of requiredFields) {
            if (!props[field]) {
                return [false, `${label} is required. Value: ${props[field]}`];
            }
        }

        return [true, null];
    }

    private static _requiredFields(): [keyof ClientProps, string][] {
        return [
            ['name', 'Name'],
            ['phone', 'Phone'],
            ['email', 'Email']
        ];
    }

    get name(): string { return this._name; }
    get phone(): string { return this._phone; }
    get email(): string { return this._email; }
    get requiredFields(): [keyof ClientProps, string][] { return Client._requiredFields(); }
}
