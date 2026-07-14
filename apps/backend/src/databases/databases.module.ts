import { Module } from "@nestjs/common";
import { PagesModule } from "../pages/pages.module";
import { DatabasesController } from "./databases.controller";
import { RowsController } from "./rows.controller";
import { DatabasesService } from "./databases.service";

@Module({
  imports: [PagesModule],
  controllers: [DatabasesController, RowsController],
  providers: [DatabasesService],
})
export class DatabasesModule {}
