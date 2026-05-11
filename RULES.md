# Project Rules & AI Guidelines

These rules dictate the fundamental architecture and constraints of the Secure Local Image & Prompt Management System. All agents and contributors must adhere to these guidelines.

## 1. Source of Truth
- **Design & Architecture**: `meta/PROJECT_DESIGN.md` is the ultimate source of truth for the application's flow, UI rules, and business logic.
- **Database Schema**: `meta/schema.sql` defines the data structures and relationships. Do not invent new columns or tables without updating this file.

## 2. Technology Stack
- **Backend**: Django + Django REST Framework.
- **Frontend**: React + TypeScript (built with Vite).
- **Database**: SQLite (Development/Default).
- **Python Package Management**: Always use `uv` for managing dependencies.
- **Image Processing**: Use Pillow locally for generating thumbnails before uploading.
- **Image Hosting**: Cloudinary.

## 3. Core Business Logic & Constraints
- **Immutability**:
  - `Item.resolved_text` is permanently locked upon item creation.
  - `Item.placeholder_values` is locked after the one-time template edit.
  - `PromptTemplate.raw_content`, `placeholders`, and `title` are permanently locked after the one-time edit is submitted.
- **Templates**: `raw_content` must remain globally unique across all templates. Templates are modified by creating copies, which must differ in `raw_content`.
- **Placeholders**: The `placeholders` JSON array is strictly derived from parsing `<<placeholder>>` syntax in `raw_content`.

## 4. Workflows
- **Image Deletion**: When an item or template is deleted, ensure Cloudinary images are deleted via API *before* deleting the database rows.
- **UI Guidelines**: Follow the specific UI patterns described in `PROJECT_DESIGN.md` (e.g., side-by-side diff editors, lazy-loaded dropdowns, confirmation dialogs).
