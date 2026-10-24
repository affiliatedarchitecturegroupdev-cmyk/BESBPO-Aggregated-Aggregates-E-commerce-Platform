import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { Public, Roles } from "../common/auth/decorators";
import { GapsQuery, GapUpdateDto, SearchEventDto, SectionEventDto, SynonymDto } from "./discovery.dto";
import { DiscoveryService } from "./discovery.service";

/** Search and merchandising insights (docs/search-insights.md): counts from the storefront, gaps and synonyms for staff. */
@Controller("discovery")
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  /** A search and how many products it found (sent by the storefront's server; counts only). */
  @Public()
  @Post("searches")
  @HttpCode(204)
  search(@Body() dto: SearchEventDto) {
    return this.discovery.recordSearch(dto.query, dto.results);
  }

  /** A view or click on a merchandising section (counts only). */
  @Public()
  @Post("sections")
  @HttpCode(204)
  section(@Body() dto: SectionEventDto) {
    return this.discovery.recordSection(dto.slot, dto.type);
  }

  @Public()
  @Get("synonyms")
  synonyms() {
    return this.discovery.publicSynonyms();
  }

  @Roles("STAFF", "ADMIN")
  @Get("gaps")
  gaps(@Query() query: GapsQuery) {
    return this.discovery.gaps(query);
  }

  @Roles("STAFF", "ADMIN")
  @Get("gaps/counts")
  gapCounts() {
    return this.discovery.gapCounts();
  }

  @Roles("STAFF", "ADMIN")
  @Put("gaps/:id")
  updateGap(@Param("id") id: string, @Body() dto: GapUpdateDto) {
    return this.discovery.updateGap(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/synonyms")
  listSynonyms() {
    return this.discovery.listSynonyms();
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/synonyms")
  createSynonym(@Body() dto: SynonymDto) {
    return this.discovery.createSynonym(dto.terms);
  }

  @Roles("STAFF", "ADMIN")
  @Put("staff/synonyms/:id")
  updateSynonym(@Param("id") id: string, @Body() dto: SynonymDto) {
    return this.discovery.updateSynonym(id, dto.terms);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("staff/synonyms/:id")
  @HttpCode(204)
  removeSynonym(@Param("id") id: string) {
    return this.discovery.removeSynonym(id);
  }
}
