import { Module } from "@nestjs/common";
import { ProjectListsController } from "./project-lists.controller";
import { ProjectListsService } from "./project-lists.service";

@Module({ controllers: [ProjectListsController], providers: [ProjectListsService] })
export class ProjectListsModule {}
