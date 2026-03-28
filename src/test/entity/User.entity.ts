import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

import { Post } from './Post.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @OneToMany(() => Post, (post) => post.user)
  posts!: Post[];
}
