import { Module } from "@nestjs/common";
import { CatalogueFeedController } from "./catalogue-feed.controller";
import { CatalogueFeedService } from "./catalogue-feed.service";

@Module({ controllers: [CatalogueFeedController], providers: [CatalogueFeedService] })
export class CatalogueFeedModule {}
