import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationSchema } from '../../persistence/schemas/organization.schema';
import { UserSchema } from '../../persistence/schemas/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Organization', schema: OrganizationSchema }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [AuthService, TokenService, MongooseModule]
})
export class AuthModule {}
