import { query } from 'odata-v4-parser';

import type { SqlOptions } from '../types';
import { TypeOrmVisitor } from './TypeOrmVisitor';

describe('TypeOrmVisitor', () => {
  function processQuery(
    odataQuery: string,
    options: Partial<SqlOptions> = {},
    table = 'users'
  ): { sql: string; parameters: Map<string, unknown> } {
    const ast = query(odataQuery);
    const visitor = new TypeOrmVisitor({
      alias: 'u',
      useParameters: true,
      ...options,
    });

    visitor.Visit(ast);

    const sql = visitor.from(table);

    return { sql, parameters: visitor.parameters };
  }

  describe('$select', () => {
    it('should generate simple SELECT', () => {
      const { sql } = processQuery('$select=id,name');

      expect(sql).toBe('SELECT u.id, u.name FROM users WHERE 1 = 1 ORDER BY 1');
    });

    it('should handle multiple selects with comma', () => {
      const { sql } = processQuery('$select=id,name,email');

      expect(sql).toMatch(/SELECT u\.id, u\.name, u\.email FROM/);
    });

    it('should handle nested select (expand relation)', () => {
      const { sql } = processQuery('$select=id,profile/avatar');

      expect(sql).toMatch(/SELECT u\.id, profile\.avatar FROM users WHERE/);
    });

    it('should handle multiple nested selects', () => {
      const { sql } = processQuery('$select=id,profile/avatar,profile/bio');

      expect(sql).toMatch(/SELECT u\.id, profile\.avatar, profile\.bio FROM/);
    });
  });

  describe('$filter', () => {
    it('should generate simple equality', () => {
      const { sql, parameters } = processQuery("$filter=name eq 'John'");

      expect(sql).toContain('WHERE u.name = :p');
      expect(parameters.get('p0')).toBe('John');
    });

    it('should handle AND/OR', () => {
      const { sql, parameters } = processQuery("$filter=name eq 'John' and age gt 18");

      expect(sql).toContain('WHERE u.name = :p0 AND u.age > :p1');
      expect(parameters.get('p0')).toBe('John');
      expect(parameters.get('p1')).toBe(18);
    });

    it('should handle nested property paths', () => {
      const { sql, parameters } = processQuery('$filter=profile/age gt 18');

      expect(sql).toContain('WHERE profile.age > :p0');
      expect(parameters.get('p0')).toBe(18);
    });

    it('should handle deep nested paths', () => {
      const { sql, parameters } = processQuery("$filter=profile/address/city eq 'Moscow'");

      expect(sql).toContain('WHERE profile.address.city = :p0');
      expect(parameters.get('p0')).toBe('Moscow');
    });
  });

  describe('$orderby', () => {
    it('should generate ORDER BY', () => {
      const { sql } = processQuery('$orderby=name');

      expect(sql).toContain('ORDER BY u.name');
    });

    it('should handle multiple order fields', () => {
      const { sql } = processQuery('$orderby=name desc,age asc');

      expect(sql).toContain('ORDER BY u.name DESC, u.age ASC');
    });

    it('should handle nested property orderby', () => {
      const { sql } = processQuery('$orderby=Profile/Name');

      expect(sql).toContain('ORDER BY Profile.Name');
    });
  });

  describe('$expand', () => {
    it('should create include visitors for expanded relations', () => {
      const { sql } = processQuery('$expand=Profile');

      expect(sql).toContain('SELECT * FROM users WHERE 1 = 1 ORDER BY 1');

      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });
      const ast = query('$expand=Profile');

      visitor.Visit(ast);

      expect(visitor.includes.length).toBe(1);
      expect(visitor.includes[0].navigationProperty).toBe('Profile');
    });

    it('should handle nested expand', () => {
      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });
      const ast = query('$expand=profile($expand=avatar)');

      visitor.Visit(ast);

      expect(visitor.includes.length).toBe(1);

      const profileVisitor = visitor.includes[0];

      expect(profileVisitor.navigationProperty).toBe('profile');
      expect(profileVisitor.includes.length).toBe(1);
      expect(profileVisitor.includes[0].navigationProperty).toBe('avatar');
    });
  });

  describe('OData functions', () => {
    describe('contains', () => {
      it('should generate LIKE with parameters', () => {
        const { sql, parameters } = processQuery("$filter=contains(name, 'John')");

        expect(sql).toContain('SELECT * FROM users WHERE u.name like ? ORDER BY 1');
        expect(parameters.get('p0')).toBe('%John%');
      });
    });

    describe('startswith', () => {
      it('should generate LIKE with suffix %', () => {
        const { sql, parameters } = processQuery("$filter=startswith(name, 'Jo')");

        expect(sql).toContain('SELECT * FROM users WHERE u.name like ? ORDER BY 1');
        expect(parameters.get('p0')).toBe('Jo%');
      });
    });

    describe('endswith', () => {
      it('should generate LIKE with prefix %', () => {
        const { sql, parameters } = processQuery("$filter=endswith(name, 'hn')");

        expect(sql).toContain('SELECT * FROM users WHERE u.name like ? ORDER BY 1');
        expect(parameters.get('p0')).toBe('%hn');
      });
    });

    describe('indexof', () => {
      it('should generate INSTR for Oracle', () => {
        const { sql } = processQuery("$filter=indexof(name, 'o') eq 2");

        expect(sql).toContain('WHERE INSTR(u.name, :p0) - 1 = :p1');
      });
    });

    describe('round', () => {
      it('should generate ROUND', () => {
        const { sql } = processQuery('$filter=round(price) eq 10');

        expect(sql).toContain('WHERE ROUND(u.price) = :p0');
      });
    });

    describe('length', () => {
      it('should generate LEN', () => {
        const { sql } = processQuery('$filter=length(name) gt 5');

        expect(sql).toContain('WHERE LEN(u.name) > :p0');
      });
    });

    describe('tolower', () => {
      it('should generate LOWER', () => {
        const { sql } = processQuery("$filter=tolower(name) eq 'john'");

        expect(sql).toContain('WHERE LOWER(u.name) = :p0');
      });
    });

    describe('toupper', () => {
      it('should generate UPPER', () => {
        const { sql } = processQuery("$filter=toupper(name) eq 'JOHN'");

        expect(sql).toContain('WHERE UPPER(u.name) = :p0');
      });
    });

    describe('year/month/day/hour/minute/second', () => {
      it('should generate YEAR(createdAt)', () => {
        const { sql } = processQuery('$filter=year(createdAt) eq 2023');

        expect(sql).toContain('WHERE YEAR(u.createdAt) = :p0');
      });
    });

    describe('now', () => {
      it('should generate NOW()', () => {
        const { sql } = processQuery('$filter=createdAt lt now()');

        expect(sql).toContain('WHERE u.createdAt < NOW()');
      });
    });

    describe('trim', () => {
      it('should generate TRIM', () => {
        const { sql } = processQuery("$filter=trim(name) eq 'John'");

        expect(sql).toContain("WHERE TRIM(' ' FROM u.name) = :p0");
      });
    });
  });

  describe('NULL handling', () => {
    it('should replace = NULL with IS NULL', () => {
      const { sql } = processQuery('$filter=name eq null');

      expect(sql).toContain('WHERE u.name IS NULL');
    });

    it('should replace <> NULL with IS NOT NULL', () => {
      const { sql } = processQuery('$filter=name ne null');

      expect(sql).toContain('WHERE u.name IS NOT NULL');
    });
  });

  describe('Parameters', () => {
    it('should use parameters when useParameters: true', () => {
      const { sql, parameters } = processQuery("$filter=name eq 'John' and age gt 18", {
        useParameters: true,
      });

      expect(sql).toContain(':p0');
      expect(sql).toContain(':p1');
      expect(parameters.get('p0')).toBe('John');
      expect(parameters.get('p1')).toBe(18);
    });

    it('should inline literals when useParameters: false', () => {
      const { sql, parameters } = processQuery("$filter=name eq 'John' and age gt 18", {
        useParameters: false,
      });

      expect(sql).toContain("u.name = 'John'");
      expect(sql).toContain('u.age > 18');
      expect(parameters.size).toBe(0);
    });
  });

  describe('Includes (expand) logic', () => {
    it('should create include visitor for property path in filter', () => {
      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });
      const ast = query('$filter=Profile/Age gt 18');

      visitor.Visit(ast);

      expect(visitor.includes.length).toBe(1);

      const profileVisitor = visitor.includes[0];

      expect(profileVisitor.navigationProperty).toBe('Profile');

      expect(profileVisitor.where).toBe('1 = 1');
      expect(profileVisitor.select).toBe('');
    });

    it('should reuse existing include visitor', () => {
      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });
      const ast = query('$expand=Profile&$filter=Profile/Age gt 18');

      visitor.Visit(ast);

      expect(visitor.includes.length).toBe(1);

      const profileVisitor = visitor.includes[0];

      expect(profileVisitor.navigationProperty).toBe('Profile');
      expect(profileVisitor.where).toBe('1 = 1');
    });
  });

  describe('from() method', () => {
    it('should generate basic SELECT with no WHERE/ORDER', () => {
      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });
      const sql = visitor.from('users');

      expect(sql).toBe('SELECT  FROM users WHERE  ORDER BY ');
    });

    it('should include OFFSET and FETCH when skip and limit are numbers', () => {
      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });

      visitor.skip = 10;
      visitor.limit = 20;

      const sql = visitor.from('users');

      expect(sql).toContain('OFFSET 10 ROWS');
      expect(sql).toContain('FETCH NEXT 20 ROWS ONLY');
    });

    it('should add OFFSET 0 ROWS when limit present but skip absent', () => {
      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });

      visitor.limit = 20;

      const sql = visitor.from('users');

      expect(sql).toContain('OFFSET 0 ROWS');
      expect(sql).toContain('FETCH NEXT 20 ROWS ONLY');
    });

    it('should not add OFFSET/FETCH when skip and limit are undefined', () => {
      const visitor = new TypeOrmVisitor({ alias: 'u', useParameters: true });
      const sql = visitor.from('users');

      expect(sql).not.toContain('OFFSET');
      expect(sql).not.toContain('FETCH');
    });
  });
});
