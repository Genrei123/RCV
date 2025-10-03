"use strict";
// import { ObjectType, Field, ID, InputType, Int } from 'type-graphql';
// import { IsEmail, MinLength } from 'class-validator';
// // User GraphQL Type - matching your User entity
// @ObjectType()
// export class User {
//   @Field(() => ID)
//   _id: string;
//   @Field()
//   firstName: string;
//   @Field()
//   lastName: string;
//   @Field()
//   fullName: string;
//   @Field({ nullable: true })
//   middleName?: string;
//   @Field()
//   email: string;
//   @Field()
//   dateOfBirth: Date;
//   @Field()
//   phoneNumber: string;
//   @Field()
//   stationedAt: string;
//   @Field()
//   createdAt: Date;
//   @Field()
//   updatedAt: Date;
//   @Field()
//   isActive: boolean;
//   @Field()
//   role: string;
//   @Field(() => [AuditTrail], { nullable: true })
//   auditTrails?: AuditTrail[];
// }
// // Audit Trail GraphQL Type - matching your AuditTrail entity
// @ObjectType()
// export class AuditTrail {
//   @Field(() => ID)
//   id: string;
//   @Field()
//   userId: string;
//   @Field()
//   action: string;
//   @Field()
//   type: string;
//   @Field({ nullable: true })
//   details?: string;
//   @Field()
//   timestamp: Date;
//   @Field({ nullable: true })
//   ipAddress?: string;
//   @Field({ nullable: true })
//   userAgent?: string;
//   @Field({ nullable: true })
//   location?: string;
//   @Field(() => User, { nullable: true })
//   user?: User;
// }
// // Product GraphQL Type
// @ObjectType()
// export class Product {
//   @Field(() => ID)
//   id: string;
//   @Field()
//   name: string;
//   @Field()
//   type: string;
//   @Field()
//   LTONumber: string;
//   @Field()
//   CFPRNumber: string;
//   @Field()
//   manufacturerName: string;
//   @Field({ nullable: true })
//   distributorName?: string;
//   @Field({ nullable: true })
//   importerName?: string;
// }
// // Input Types for Mutations
// @InputType()
// export class CreateUserInput {
//   @Field()
//   @MinLength(2)
//   firstName: string;
//   @Field()
//   @MinLength(2)
//   lastName: string;
//   @Field({ nullable: true })
//   middleName?: string;
//   @Field()
//   @IsEmail()
//   email: string;
//   @Field()
//   dateOfBirth: Date;
//   @Field()
//   phoneNumber: string;
//   @Field()
//   @MinLength(6)
//   password: string;
//   @Field()
//   stationedAt: string;
//   @Field()
//   role: string;
// }
// @InputType()
// export class CreateAuditTrailInput {
//   @Field()
//   userId: string;
//   @Field()
//   action: string;
//   @Field()
//   type: string;
//   @Field({ nullable: true })
//   details?: string;
//   @Field({ nullable: true })
//   ipAddress?: string;
//   @Field({ nullable: true })
//   userAgent?: string;
//   @Field({ nullable: true })
//   location?: string;
// }
// @InputType()
// export class AuditTrailFilters {
//   @Field({ nullable: true })
//   userId?: string;
//   @Field({ nullable: true })
//   action?: string;
//   @Field({ nullable: true })
//   type?: string;
//   @Field({ nullable: true })
//   startDate?: Date;
//   @Field({ nullable: true })
//   endDate?: Date;
// }
//# sourceMappingURL=types.js.map