import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';

@ApiTags('Parts & Supplies')
@ApiBearerAuth()
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Post()
  @ApiOperation({ summary: 'Register part/supply' })
  create(@Body() dto: CreatePartDto) {
    return this.partsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List parts/supplies' })
  findAll() {
    return this.partsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get part by ID' })
  findOne(@Param('id') id: string) {
    return this.partsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update part/supply' })
  update(@Param('id') id: string, @Body() dto: UpdatePartDto) {
    return this.partsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove part/supply' })
  remove(@Param('id') id: string) {
    return this.partsService.remove(id);
  }
}
