import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const demoUsers = pgTable('demo_users', {
  id: serial('id').primaryKey(),
  name: text('name'),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  techStack: text('tech_stack').array().notNull(),
  coverImage: text('cover_image'),
  liveUrl: text('live_url'),
  githubUrl: text('github_url'),
  featured: boolean('featured').notNull().default(false),
  status: text('status').notNull().default('completed'),
  year: integer('year').notNull(),
  problem: text('problem'),
  solution: text('solution'),
  results: text('results'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
