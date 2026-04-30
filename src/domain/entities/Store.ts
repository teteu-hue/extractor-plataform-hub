import { PlatformEnum } from '../value-objects/Platform';
import { CreateStoreProps } from '../value-objects/CreateStoreProps';
import { MercadoLivreConfigDto } from 'src/application/ports/out/platforms/mercadolivre/dtos/MercadoLivreDto';
import { InvalidStoreError } from '../errors/DomainError';

export class Store {
    private readonly _name: string;
    private readonly _email: string;
    private readonly _platformId: PlatformEnum;
    private readonly _mercadoLivreConfig: MercadoLivreConfigDto;


    private constructor(props: CreateStoreProps) {
        this._name = props.name;
        this._email = props.email;
        this._platformId = props.platformId;
        this._mercadoLivreConfig = props.mercadoLivreConfig;
    }

    static create(props: CreateStoreProps): Store {
        this._validate(props);
        return new Store(props);
    }

    private static _validate(props: CreateStoreProps): void | InvalidStoreError {
        if (!props.name) {
            throw new InvalidStoreError('Store name is required');
        }
        if (!props.email) {
            throw new InvalidStoreError('Store email is required');
        }
        if (!props.platformId) {
            throw new InvalidStoreError('Store platform ID is required');
        }
        if (!props.mercadoLivreConfig) {
            throw new InvalidStoreError('Store Mercado Livre config is required');
        }
        return;
    }

    get name(): string { return this._name; }
    get email(): string { return this._email; }
    get platformId(): PlatformEnum { return this._platformId; }
    get mercadoLivreConfig(): MercadoLivreConfigDto { return this._mercadoLivreConfig; }

    toJSON(): Record<string, unknown> {
        return {
            name: this._name,
            email: this._email,
            platformId: this._platformId,
            mercadoLivreConfig: this._mercadoLivreConfig,
        };
    }
}

const store = Store.create({
    name: 'Store 1',
    email: '@gmail.com',
    platformId: PlatformEnum.MERCADOLIVRE,
    mercadoLivreConfig: {
        access_token: '1234567890',
        token_type: 'Bearer',
        expires_in: 360000 ,
        scope: 'read write',
        user_id: 1234567890,
        refresh_token: '1234567890',
    }
});

console.log(store.toJSON());