/**
 * Handlebars-based template engine implementing the TemplateEngine interface.
 */
import Handlebars from 'handlebars';
import { readFile } from 'node:fs/promises';
import type { TemplateEngine } from '../core/types.js';

function registerHelpers(hbs: typeof Handlebars): void {
  hbs.registerHelper('if_eq', function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  hbs.registerHelper('if_in', function (this: unknown, value: unknown, array: unknown, options: Handlebars.HelperOptions) {
    const list = Array.isArray(array) ? array : [];
    return list.includes(value) ? options.fn(this) : options.inverse(this);
  });

  hbs.registerHelper('json', function (value: unknown) {
    return new Handlebars.SafeString(JSON.stringify(value, null, 2));
  });

  hbs.registerHelper('lowercase', function (value: unknown) {
    return typeof value === 'string' ? value.toLowerCase() : '';
  });

  hbs.registerHelper('uppercase', function (value: unknown) {
    return typeof value === 'string' ? value.toUpperCase() : '';
  });
}

export function createTemplateEngine(): TemplateEngine {
  const hbs = Handlebars.create();
  registerHelpers(hbs);

  return {
    async render(templatePath: string, data: Record<string, unknown>): Promise<string> {
      const source = await readFile(templatePath, 'utf-8');
      const template = hbs.compile(source);
      return template(data);
    },

    renderString(template: string, data: Record<string, unknown>): string {
      const compiled = hbs.compile(template);
      return compiled(data);
    },
  };
}
