import { Resolver, Query, Mutation, Arg, FieldResolver, Root, ID, Int, Ctx } from 'type-graphql';
import { User, AuditTrail, Product, CreateUserInput, CreateAuditTrailInput, AuditTrailFilters } from './types';
import { User as UserEntity } from '../typeorm/entities/user.entity';
import { AuditTrail as AuditTrailEntity } from '../typeorm/entities/audit-trail.entity';
import { Product as ProductEntity } from '../typeorm/entities/product.entity';
import { DB } from '../typeorm/data-source';

@Resolver(User)
export class UserResolver {
  @Query(() => [User])
  async users(): Promise<User[]> {
    const userRepository = DB.getRepository(UserEntity);
    const users = await userRepository.find({
      where: { isActive: true }
    });
    
    return users.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      middleName: user.middleName,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber,
      stationedAt: user.stationedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
      role: user.role
    }));
  }

  @Query(() => User, { nullable: true })
  async user(@Arg('id', () => ID) id: string): Promise<User | null> {
    const userRepository = DB.getRepository(UserEntity);
    const user = await userRepository.findOne({ 
      where: { _id: id } 
    });
    
    if (!user) return null;
    
    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      middleName: user.middleName,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber,
      stationedAt: user.stationedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
      role: user.role
    };
  }

  @Mutation(() => User)
  async createUser(@Arg('input') input: CreateUserInput): Promise<User> {
    const userRepository = DB.getRepository(UserEntity);
    
    const newUser = new UserEntity();
    Object.assign(newUser, input);
    newUser.isActive = true;
    
    const savedUser = await userRepository.save(newUser);
    
    return {
      _id: savedUser._id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      fullName: savedUser.fullName,
      middleName: savedUser.middleName,
      email: savedUser.email,
      dateOfBirth: savedUser.dateOfBirth,
      phoneNumber: savedUser.phoneNumber,
      stationedAt: savedUser.stationedAt,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
      isActive: savedUser.isActive,
      role: savedUser.role
    };
  }

  @FieldResolver(() => [AuditTrail])
  async auditTrails(@Root() user: User): Promise<AuditTrail[]> {
    const auditRepository = DB.getRepository(AuditTrailEntity);
    const audits = await auditRepository.find({
      where: { userId: user._id },
      order: { timestamp: 'DESC' }
    });
    
    return audits.map(audit => ({
      id: audit.id,
      userId: audit.userId,
      action: audit.action,
      type: audit.type,
      details: audit.details,
      timestamp: audit.timestamp,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      location: audit.location
    }));
  }
}

@Resolver(AuditTrail)
export class AuditTrailResolver {
  @Query(() => [AuditTrail])
  async auditTrails(
    @Arg('filters', () => AuditTrailFilters, { nullable: true }) filters?: AuditTrailFilters,
    @Arg('page', () => Int, { nullable: true }) page?: number,
    @Arg('limit', () => Int, { nullable: true }) limit?: number
  ): Promise<AuditTrail[]> {
    const auditRepository = DB.getRepository(AuditTrailEntity);
    
    const queryBuilder = auditRepository.createQueryBuilder('audit');
    
    // Apply filters
    if (filters?.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }
    if (filters?.action) {
      queryBuilder.andWhere('audit.action ILIKE :action', { action: `%${filters.action}%` });
    }
    if (filters?.type) {
      queryBuilder.andWhere('audit.type = :type', { type: filters.type });
    }
    if (filters?.startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', { endDate: filters.endDate });
    }
    
    // Apply pagination
    if (page && limit) {
      queryBuilder.skip((page - 1) * limit).take(limit);
    } else if (limit) {
      queryBuilder.take(limit);
    }
    
    // Order by timestamp descending
    queryBuilder.orderBy('audit.timestamp', 'DESC');
    
    const audits = await queryBuilder.getMany();
    
    return audits.map(audit => ({
      id: audit.id,
      userId: audit.userId,
      action: audit.action,
      type: audit.type,
      details: audit.details,
      timestamp: audit.timestamp,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      location: audit.location
    }));
  }

  @Query(() => Int)
  async auditTrailsCount(
    @Arg('filters', () => AuditTrailFilters, { nullable: true }) filters?: AuditTrailFilters
  ): Promise<number> {
    const auditRepository = DB.getRepository(AuditTrailEntity);
    
    const queryBuilder = auditRepository.createQueryBuilder('audit');
    
    // Apply same filters as above
    if (filters?.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }
    if (filters?.action) {
      queryBuilder.andWhere('audit.action ILIKE :action', { action: `%${filters.action}%` });
    }
    if (filters?.type) {
      queryBuilder.andWhere('audit.type = :type', { type: filters.type });
    }
    if (filters?.startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', { endDate: filters.endDate });
    }
    
    return await queryBuilder.getCount();
  }

  @Mutation(() => AuditTrail)
  async createAuditTrail(
    @Arg('input') input: CreateAuditTrailInput,
    @Ctx() context: any
  ): Promise<AuditTrail> {
    const auditRepository = DB.getRepository(AuditTrailEntity);
    
    const newAudit = new AuditTrailEntity(
      input.userId,
      input.action,
      input.type,
      input.details,
      input.ipAddress || context.req?.ip,
      input.userAgent || context.req?.get('User-Agent'),
      input.location
    );
    
    const savedAudit = await auditRepository.save(newAudit);
    
    return {
      id: savedAudit.id,
      userId: savedAudit.userId,
      action: savedAudit.action,
      type: savedAudit.type,
      details: savedAudit.details,
      timestamp: savedAudit.timestamp,
      ipAddress: savedAudit.ipAddress,
      userAgent: savedAudit.userAgent,
      location: savedAudit.location
    };
  }

  @FieldResolver(() => User)
  async user(@Root() auditTrail: AuditTrail): Promise<User | null> {
    const userRepository = DB.getRepository(UserEntity);
    const user = await userRepository.findOne({ 
      where: { _id: auditTrail.userId } 
    });
    
    if (!user) return null;
    
    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      middleName: user.middleName,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber,
      stationedAt: user.stationedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
      role: user.role
    };
  }
}

@Resolver(Product)
export class ProductResolver {
  @Query(() => [Product])
  async products(): Promise<Product[]> {
    const productRepository = DB.getRepository(ProductEntity);
    const products = await productRepository.find();
    
    return products.map(product => ({
      id: product.id,
      name: product.productName,
      type: product.productType?.toString() || 'Unknown',
      LTONumber: product.LTONumber,
      CFPRNumber: product.CFPRNumber,
      manufacturerName: product.manufacturerName,
      distributorName: product.distributorName,
      importerName: product.importerName
    }));
  }

  @Query(() => Product, { nullable: true })
  async product(@Arg('id', () => ID) id: string): Promise<Product | null> {
    const productRepository = DB.getRepository(ProductEntity);
    const product = await productRepository.findOne({ 
      where: { id } 
    });
    
    if (!product) return null;
    
    return {
      id: product.id,
      name: product.productName,
      type: product.productType?.toString() || 'Unknown',
      LTONumber: product.LTONumber,
      CFPRNumber: product.CFPRNumber,
      manufacturerName: product.manufacturerName,
      distributorName: product.distributorName,
      importerName: product.importerName
    };
  }
}