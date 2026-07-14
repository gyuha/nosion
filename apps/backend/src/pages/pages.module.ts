import { Module } from "@nestjs/common";
import { PagesController } from "./pages.controller";
import { TrashController } from "./trash.controller";
import { PagesService } from "./pages.service";

@Module({
  controllers: [PagesController, TrashController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
