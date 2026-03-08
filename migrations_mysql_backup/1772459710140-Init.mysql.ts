import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1772459710140 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create `user` table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user\` (
        id int NOT NULL AUTO_INCREMENT,
        username varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        avatar varchar(255) DEFAULT NULL,
        roles text DEFAULT NULL,
        password varchar(255) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_user_username (username),
        UNIQUE KEY uniq_user_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create `todo` table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS todo (
        id int NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL,
        completed tinyint(1) NOT NULL DEFAULT 0,
        dueDate datetime DEFAULT NULL,
        priority varchar(255) NOT NULL DEFAULT 'medium',
        category varchar(255) DEFAULT NULL,
        userId int NOT NULL,
        recurrence varchar(255) DEFAULT NULL,
        recurrenceEnd datetime DEFAULT NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt datetime DEFAULT NULL,
        PRIMARY KEY (id),
        KEY fk_todo_user (userId),
        CONSTRAINT fk_todo_user FOREIGN KEY (userId) REFERENCES \`user\` (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create `activity_log` table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id int NOT NULL AUTO_INCREMENT,
        userId int NOT NULL,
        todoId int DEFAULT NULL,
        action varchar(255) NOT NULL,
        details text DEFAULT NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY fk_activity_user (userId),
        KEY fk_activity_todo (todoId),
        CONSTRAINT fk_activity_user FOREIGN KEY (userId) REFERENCES \`user\` (id),
        CONSTRAINT fk_activity_todo FOREIGN KEY (todoId) REFERENCES todo (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS activity_log;`);
    await queryRunner.query(`DROP TABLE IF EXISTS todo;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user\`;`);
  }
}
