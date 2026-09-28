import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Public, Roles } from "../common/auth/decorators";
import { ImportOptionsDto, ListSuppliersQuery, NearestQuery, SupplierDto } from "./suppliers.dto";
import { SuppliersService } from "./suppliers.service";

@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  /** Public delivery coverage — no supplier names or contacts. */
  @Public()
  @Get("coverage")
  coverage() {
    return this.suppliers.coverage();
  }

  /** Public partner network: names, towns and categories — never contacts. */
  @Public()
  @Get("network")
  network() {
    return this.suppliers.network();
  }

  /** Public nearest delivery point for a location (not stored). */
  @Public()
  @Get("nearest")
  nearest(@Query() query: NearestQuery) {
    return this.suppliers.nearest(query.lat, query.lng, query.category);
  }

  @Roles("STAFF", "ADMIN")
  @Get()
  list(@Query() query: ListSuppliersQuery) {
    return this.suppliers.list(query.province, query.filter);
  }

  @Roles("STAFF", "ADMIN")
  @Get("export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="supplier-database.csv"')
  @Header("Cache-Control", "private, no-store")
  export() {
    return this.suppliers.exportCsv();
  }

  @Roles("STAFF", "ADMIN")
  @Post("import")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  import(@UploadedFile() file: Express.Multer.File | undefined, @Body() options: ImportOptionsDto) {
    if (!file?.buffer?.length) throw new BadRequestException("Attach the supplier database CSV.");
    return this.suppliers.importCsv(file.buffer.toString("utf8"), options.activateLaunchProvincesOnly !== "false");
  }

  @Roles("STAFF", "ADMIN")
  @Post()
  create(@Body() dto: SupplierDto) {
    return this.suppliers.create(dto);
  }

  @Roles("STAFF", "ADMIN")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.suppliers.get(id);
  }

  @Roles("STAFF", "ADMIN")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: SupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.suppliers.remove(id);
  }
}
