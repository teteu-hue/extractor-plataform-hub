import { MercadoLivreConfigDto } from "@application/ports/out/platforms/mercadolivre/dtos/MercadoLivreDto";
import { PlatformEnum } from "./Platform";

export interface CreateStoreProps {
    name: string;
    email: string;
    platformId: PlatformEnum;
    mercadoLivreConfig: MercadoLivreConfigDto;
}
