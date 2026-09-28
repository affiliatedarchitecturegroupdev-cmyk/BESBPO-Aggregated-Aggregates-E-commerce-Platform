import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { Public, Roles } from "../common/auth/decorators";
import { BlogCategoryDto, BlogPostDto } from "./blog.dto";
import { BlogService } from "./blog.service";

/** Public reads are published posts only; everything else is staff-only. */
@Controller("blog")
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Public()
  @Get("categories")
  listCategories() {
    return this.blog.listCategories();
  }

  @Roles("STAFF", "ADMIN")
  @Post("categories")
  createCategory(@Body() dto: BlogCategoryDto) {
    return this.blog.createCategory(dto);
  }

  @Public()
  @Get("posts")
  listPublished() {
    return this.blog.listPublished();
  }

  @Public()
  @Get("posts/:slug")
  getPublished(@Param("slug") slug: string) {
    return this.blog.getPublished(slug);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/posts")
  listAll() {
    return this.blog.listAll();
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/posts/:id")
  get(@Param("id") id: string) {
    return this.blog.get(id);
  }

  @Roles("STAFF", "ADMIN")
  @Post("admin/posts")
  create(@Body() dto: BlogPostDto) {
    return this.blog.create(dto);
  }

  @Roles("STAFF", "ADMIN")
  @Put("admin/posts/:id")
  update(@Param("id") id: string, @Body() dto: BlogPostDto) {
    return this.blog.update(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("admin/posts/:id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.blog.remove(id);
  }
}
