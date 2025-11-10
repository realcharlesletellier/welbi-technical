import SchemaBuilder from '@pothos/core';
import { printSchema } from 'graphql';
import { eq, and, gte, lte, inArray, like, desc, asc, count, sql } from 'drizzle-orm';
import * as dbSchema from '@testwelbi/drizzle';
import type { Context, User, Role } from '../types';

// Drizzle inferred types
type WellnessDimension = typeof dbSchema.wellnessDimensions.$inferSelect;
type Hobby = typeof dbSchema.hobbies.$inferSelect;
type Tag = typeof dbSchema.tags.$inferSelect;
type LevelOfCare = typeof dbSchema.levelsOfCare.$inferSelect;
type Facilitator = typeof dbSchema.facilitators.$inferSelect;
type Location = typeof dbSchema.locations.$inferSelect;
type EventSeries = typeof dbSchema.eventSeries.$inferSelect;
type RecurrencePattern = typeof dbSchema.recurrencePatterns.$inferSelect;
type Event = typeof dbSchema.events.$inferSelect;

// Event status enum values
type EventStatus = 'scheduled' | 'cancelled' | 'completed';
type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ParticipantStatus = 'registered' | 'attended' | 'no_show' | 'cancelled';

// Active participant statuses (used for counting current participants)
const ACTIVE_PARTICIPANT_STATUSES: ParticipantStatus[] = ['registered', 'attended'];

// Schema builder
export const builder = new SchemaBuilder<{
  Context: Context;
  Scalars: {
    DateTime: {
      Input: Date | string | number;
      Output: string;
    };
  };
}>({
  plugins: [],
});

// Scalar types
builder.scalarType('DateTime', {
  serialize: (date: unknown) => {
    if (date instanceof Date) {
      return date.toISOString();
    }
    if (typeof date === 'number') {
      return new Date(date * 1000).toISOString();
    }
    return String(date);
  },
  parseValue: (value) => {
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    throw new Error('Invalid date format');
  },
});

// Helper function to convert timestamp to Date
function timestampToDate(timestamp: number | null): Date | null {
  return timestamp ? new Date(timestamp * 1000) : null;
}

// Enums
const EventStatus = builder.enumType('EventStatus', {
  values: ['scheduled', 'cancelled', 'completed'] as const,
});

const RecurrenceType = builder.enumType('RecurrenceType', {
  values: ['daily', 'weekly', 'monthly', 'yearly'] as const,
});

const ParticipantStatus = builder.enumType('ParticipantStatus', {
  values: ['registered', 'attended', 'no_show', 'cancelled'] as const,
});

const SortDirection = builder.enumType('SortDirection', {
  values: ['asc', 'desc'] as const,
});

const EventSortField = builder.enumType('EventSortField', {
  values: ['startTime', 'title', 'createdAt', 'currentParticipants'] as const,
});

// Input types
const EventFiltersInput = builder.inputType('EventFiltersInput', {
  fields: (t) => ({
    startDate: t.field({ type: 'DateTime', required: false }),
    endDate: t.field({ type: 'DateTime', required: false }),
    wellnessDimensionIds: t.stringList({ required: false }),
    hobbyIds: t.stringList({ required: false }),
    tagIds: t.stringList({ required: false }),
    levelOfCareIds: t.stringList({ required: false }),
    facilitatorIds: t.stringList({ required: false }),
    locationIds: t.stringList({ required: false }),
    seriesIds: t.stringList({ required: false }),
    status: t.field({ type: [EventStatus], required: false }),
    registrationRequired: t.boolean({ required: false }),
    hasAvailableSpots: t.boolean({ required: false }),
  }),
});

const EventSortInput = builder.inputType('EventSortInput', {
  fields: (t) => ({
    field: t.field({ type: EventSortField, required: true }),
    direction: t.field({ type: SortDirection, required: true }),
  }),
});

// Object types
const WellnessDimensionType = builder.objectRef<WellnessDimension>('WellnessDimension').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    color: t.exposeString('color', { nullable: true }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const HobbyType = builder.objectRef<Hobby>('Hobby').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    category: t.exposeString('category', { nullable: true }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const TagType = builder.objectRef<Tag>('Tag').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    color: t.exposeString('color', { nullable: true }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
    updatedAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.updatedAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const LevelOfCareType = builder.objectRef<LevelOfCare>('LevelOfCare').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    level: t.exposeInt('level'),
    requirements: t.stringList({ resolve: (obj) => Array.isArray(obj.requirements) ? obj.requirements : [] }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const FacilitatorType = builder.objectRef<Facilitator>('Facilitator').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    employeeId: t.exposeString('employeeId', { nullable: true }),
    firstName: t.exposeString('firstName'),
    lastName: t.exposeString('lastName'),
    fullName: t.string({ resolve: (obj) => `${obj.firstName} ${obj.lastName}` }),
    email: t.exposeString('email'),
    phone: t.exposeString('phone', { nullable: true }),
    department: t.exposeString('department', { nullable: true }),
    position: t.exposeString('position', { nullable: true }),
    specialties: t.stringList({ resolve: (obj) => Array.isArray(obj.specialties) ? obj.specialties : [] }),
    isActive: t.exposeBoolean('isActive'),
    hireDate: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.hireDate)?.toISOString(),
      nullable: true 
    }),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
    updatedAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.updatedAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const LocationType = builder.objectRef<Location>('Location').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    type: t.exposeString('type', { nullable: true }),
    capacity: t.exposeInt('capacity', { nullable: true }),
    equipment: t.stringList({ resolve: (obj) => Array.isArray(obj.equipment) ? obj.equipment : [] }),
    accessibility: t.stringList({ resolve: (obj) => Array.isArray(obj.accessibility) ? obj.accessibility : [] }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
    updatedAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.updatedAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const EventSeriesType = builder.objectRef<EventSeries>('EventSeries').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
    updatedAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.updatedAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const RecurrencePatternType = builder.objectRef<RecurrencePattern>('RecurrencePattern').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    type: t.exposeString('type'),
    interval: t.exposeInt('interval'),
    daysOfWeek: t.intList({ resolve: (obj) => Array.isArray(obj.daysOfWeek) ? obj.daysOfWeek : [] }),
    dayOfMonth: t.exposeInt('dayOfMonth', { nullable: true }),
    weekOfMonth: t.exposeInt('weekOfMonth', { nullable: true }),
    monthOfYear: t.exposeInt('monthOfYear', { nullable: true }),
    endDate: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.endDate)?.toISOString(),
      nullable: true 
    }),
    occurrences: t.exposeInt('occurrences', { nullable: true }),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

const EventType = builder.objectRef<Event>('Event').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    startTime: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.startTime)?.toISOString() || new Date().toISOString()
    }),
    endTime: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.endTime)?.toISOString() || new Date().toISOString()
    }),
    duration: t.exposeInt('duration', { nullable: true }),
    allDay: t.exposeBoolean('allDay'),
    maxParticipants: t.exposeInt('maxParticipants', { nullable: true }),
    currentParticipants: t.int({ 
      resolve: async (obj, _, ctx) => {
        // Count participants with active statuses
        const result = await ctx.db
          .select({ count: count() })
          .from(dbSchema.eventParticipants)
          .where(
            and(
              eq(dbSchema.eventParticipants.eventId, obj.id),
              inArray(dbSchema.eventParticipants.status, ACTIVE_PARTICIPANT_STATUSES)
            )
          );
        
        return result[0]?.count || 0;
      }
    }),
    availableSpots: t.int({ 
      resolve: async (obj, _, ctx) => {
        if (!obj.maxParticipants) return null;
        
        // Count current participants
        const result = await ctx.db
          .select({ count: count() })
          .from(dbSchema.eventParticipants)
          .where(
            and(
              eq(dbSchema.eventParticipants.eventId, obj.id),
              inArray(dbSchema.eventParticipants.status, ACTIVE_PARTICIPANT_STATUSES)
            )
          );
        
        const currentParticipants = result[0]?.count || 0;
        return obj.maxParticipants - currentParticipants;
      },
      nullable: true 
    }),
    registrationRequired: t.exposeBoolean('registrationRequired'),
    registrationDeadline: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.registrationDeadline)?.toISOString(),
      nullable: true 
    }),
    status: t.exposeString('status'),
    notes: t.exposeString('notes', { nullable: true }),
    // Check if current user is registered for this event
    isRegistered: t.boolean({
      resolve: async (obj, _, ctx) => {
        if (!ctx.user) return false;
        
        const registration = await ctx.db
          .select()
          .from(dbSchema.eventParticipants)
          .where(
            and(
              eq(dbSchema.eventParticipants.eventId, obj.id),
              eq(dbSchema.eventParticipants.userId, ctx.user.id),
              inArray(dbSchema.eventParticipants.status, ACTIVE_PARTICIPANT_STATUSES)
            )
          )
          .limit(1);
        
        return registration.length > 0;
      }
    }),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
    updatedAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.updatedAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

// User type
const UserType = builder.objectRef<User>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name'),
    createdAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.createdAt)?.toISOString() || new Date().toISOString()
    }),
    updatedAt: t.field({ 
      type: 'DateTime', 
      resolve: (obj) => timestampToDate(obj.updatedAt)?.toISOString() || new Date().toISOString()
    }),
  }),
});

// HealthCheck type
interface HealthCheck {
  status: string;
  currentUser: User | null;
}

const HealthCheckType = builder.objectRef<HealthCheck>('HealthCheck').implement({
  fields: (t) => ({
    status: t.exposeString('status'),
    currentUser: t.field({
      type: UserType,
      nullable: true,
      resolve: (obj) => obj.currentUser,
    }),
  }),
});

// Event Registration Result type
interface EventRegistrationResult {
  success: boolean;
  message: string;
  event?: Event;
}

const EventRegistrationResultType = builder.objectRef<EventRegistrationResult>('EventRegistrationResult').implement({
  fields: (t) => ({
    success: t.exposeBoolean('success'),
    message: t.exposeString('message'),
    event: t.field({
      type: EventType,
      nullable: true,
      resolve: (obj) => obj.event || null,
    }),
  }),
});

// Query type with simplified event queries
builder.queryType({
  fields: (t) => ({
    // Basic health checks
    health: t.field({
      type: HealthCheckType,
      resolve: (_, __, ctx) => ({
        status: 'OK',
        currentUser: ctx.user || null,
      }),
    }),
    version: t.string({
      resolve: () => '1.0.0',
    }),
    timestamp: t.string({
      resolve: () => new Date().toISOString(),
    }),

    // Simplified event queries - basic functionality only
    events: t.field({
      type: [EventType],
      args: {
        limit: t.arg.int({ required: false, defaultValue: 50 }),
        offset: t.arg.int({ required: false, defaultValue: 0 }),
      },
      resolve: async (_, args, ctx) => {
        const { limit = 50, offset = 0 } = args;
        const limitNumber = limit ?? 50;
        const offsetNumber = offset ?? 0;
        
        const events = await ctx.db
          .select()
          .from(dbSchema.events)
          .limit(limitNumber)
          .offset(offsetNumber);

        return events;
      },
    }),

    event: t.field({
      type: EventType,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (_, { id }, ctx) => {
        const eventId = parseInt(id);
        
        const result = await ctx.db
          .select()
          .from(dbSchema.events)
          .where(eq(dbSchema.events.id, eventId))
          .limit(1);

        if (!result.length) {
          return null;
        }

        return result[0];
      },
      nullable: true,
    }),

    // Supporting entity queries
    wellnessDimensions: t.field({
      type: [WellnessDimensionType],
      args: {
        active: t.arg.boolean({ required: false, defaultValue: true }),
      },
      resolve: async (_, { active }, ctx) => {
        if (active) {
          const results = await ctx.db
            .select()
            .from(dbSchema.wellnessDimensions)
            .where(eq(dbSchema.wellnessDimensions.isActive, true))
            .orderBy(dbSchema.wellnessDimensions.name);
          return results;
        } else {
          const results = await ctx.db
            .select()
            .from(dbSchema.wellnessDimensions)
            .orderBy(dbSchema.wellnessDimensions.name);
          return results;
        }
      },
    }),

    hobbies: t.field({
      type: [HobbyType],
      args: {
        active: t.arg.boolean({ required: false, defaultValue: true }),
        category: t.arg.string({ required: false }),
      },
      resolve: async (_, { active, category }, ctx) => {
        const conditions = [];
        if (active) conditions.push(eq(dbSchema.hobbies.isActive, true));
        if (category) conditions.push(eq(dbSchema.hobbies.category, category));
        
        if (conditions.length > 0) {
          const results = await ctx.db
            .select()
            .from(dbSchema.hobbies)
            .where(and(...conditions))
            .orderBy(dbSchema.hobbies.name);
          return results;
        } else {
          const results = await ctx.db
            .select()
            .from(dbSchema.hobbies)
            .orderBy(dbSchema.hobbies.name);
          return results;
        }
      },
    }),

    tags: t.field({
      type: [TagType],
      args: {
        active: t.arg.boolean({ required: false, defaultValue: true }),
      },
      resolve: async (_, { active }, ctx) => {
        if (active) {
          const results = await ctx.db
            .select()
            .from(dbSchema.tags)
            .where(eq(dbSchema.tags.isActive, true))
            .orderBy(dbSchema.tags.name);
          return results;
        } else {
          const results = await ctx.db
            .select()
            .from(dbSchema.tags)
            .orderBy(dbSchema.tags.name);
          return results;
        }
      },
    }),

    levelsOfCare: t.field({
      type: [LevelOfCareType],
      args: {
        active: t.arg.boolean({ required: false, defaultValue: true }),
      },
      resolve: async (_, { active }, ctx) => {
        if (active) {
          const results = await ctx.db
            .select()
            .from(dbSchema.levelsOfCare)
            .where(eq(dbSchema.levelsOfCare.isActive, true))
            .orderBy(dbSchema.levelsOfCare.level);
          return results;
        } else {
          const results = await ctx.db
            .select()
            .from(dbSchema.levelsOfCare)
            .orderBy(dbSchema.levelsOfCare.level);
          return results;
        }
      },
    }),

    facilitators: t.field({
      type: [FacilitatorType],
      args: {
        active: t.arg.boolean({ required: false, defaultValue: true }),
        department: t.arg.string({ required: false }),
      },
      resolve: async (_, { active, department }, ctx) => {
        const conditions = [];
        if (active) conditions.push(eq(dbSchema.facilitators.isActive, true));
        if (department) conditions.push(eq(dbSchema.facilitators.department, department));
        
        if (conditions.length > 0) {
          const results = await ctx.db
            .select()
            .from(dbSchema.facilitators)
            .where(and(...conditions))
            .orderBy(dbSchema.facilitators.lastName, dbSchema.facilitators.firstName);
          return results;
        } else {
          const results = await ctx.db
            .select()
            .from(dbSchema.facilitators)
            .orderBy(dbSchema.facilitators.lastName, dbSchema.facilitators.firstName);
          return results;
        }
      },
    }),

    locations: t.field({
      type: [LocationType],
      args: {
        active: t.arg.boolean({ required: false, defaultValue: true }),
        type: t.arg.string({ required: false }),
      },
      resolve: async (_, { active, type }, ctx) => {
        const conditions = [];
        if (active) conditions.push(eq(dbSchema.locations.isActive, true));
        if (type) conditions.push(eq(dbSchema.locations.type, type));
        
        if (conditions.length > 0) {
          const results = await ctx.db
            .select()
            .from(dbSchema.locations)
            .where(and(...conditions))
            .orderBy(dbSchema.locations.name);
          return results;
        } else {
          const results = await ctx.db
            .select()
            .from(dbSchema.locations)
            .orderBy(dbSchema.locations.name);
          return results;
        }
      },
    }),

    eventSeries: t.field({
      type: [EventSeriesType],
      args: {
        active: t.arg.boolean({ required: false, defaultValue: true }),
      },
      resolve: async (_, { active }, ctx) => {
        if (active) {
          const results = await ctx.db
            .select()
            .from(dbSchema.eventSeries)
            .where(eq(dbSchema.eventSeries.isActive, true))
            .orderBy(dbSchema.eventSeries.name);
          return results;
        } else {
          const results = await ctx.db
            .select()
            .from(dbSchema.eventSeries)
            .orderBy(dbSchema.eventSeries.name);
          return results;
        }
      },
    }),
  }),
});

// Mutation type with event registration mutations
builder.mutationType({
  fields: (t) => ({
    ping: t.string({
      resolve: () => 'pong',
    }),

    // Register for an event
    registerForEvent: t.field({
      type: EventRegistrationResultType,
      args: {
        eventId: t.arg.id({ required: true }),
      },
      resolve: async (_, { eventId }, ctx) => {
        // Authorization: User must be authenticated
        if (!ctx.user) {
          return {
            success: false,
            message: 'You must be logged in to register for events',
          };
        }

        const eventIdNum = parseInt(eventId);
        if (isNaN(eventIdNum)) {
          return {
            success: false,
            message: 'Invalid event ID',
          };
        }
        
        // Fetch the event
        const event = await ctx.db
          .select()
          .from(dbSchema.events)
          .where(eq(dbSchema.events.id, eventIdNum))
          .limit(1);

        if (!event.length) {
          return {
            success: false,
            message: 'Event not found',
          };
        }

        const eventData = event[0];

        // Check if event is cancelled or completed
        if (eventData.status === 'cancelled') {
          return {
            success: false,
            message: 'Cannot register for a cancelled event',
          };
        }

        if (eventData.status === 'completed') {
          return {
            success: false,
            message: 'Cannot register for a completed event',
          };
        }

        // Check if registration deadline has passed
        if (eventData.registrationDeadline) {
          const deadline = new Date(eventData.registrationDeadline * 1000);
          if (deadline < new Date()) {
            return {
              success: false,
              message: 'Registration deadline has passed',
            };
          }
        }

        // Check if user is already registered
        const existingRegistration = await ctx.db
          .select()
          .from(dbSchema.eventParticipants)
          .where(
            and(
              eq(dbSchema.eventParticipants.eventId, eventIdNum),
              eq(dbSchema.eventParticipants.userId, ctx.user.id),
              inArray(dbSchema.eventParticipants.status, ACTIVE_PARTICIPANT_STATUSES)
            )
          )
          .limit(1);

        if (existingRegistration.length > 0) {
          return {
            success: false,
            message: 'You are already registered for this event',
          };
        }

        // Register the user for the event with atomic capacity handling
        try {
          // Insert registration record first
          // This will fail if duplicate due to application-level check above
          await ctx.db.insert(dbSchema.eventParticipants).values({
            eventId: eventIdNum,
            userId: ctx.user.id,
            status: 'registered',
            registeredAt: Math.floor(Date.now() / 1000),
          });

          // Conditionally increment currentParticipants only if under capacity
          // This prevents race conditions by checking capacity during the update
          if (eventData.maxParticipants) {
            await ctx.db
              .update(dbSchema.events)
              .set({ 
                currentParticipants: sql`${dbSchema.events.currentParticipants} + 1`,
                updatedAt: Math.floor(Date.now() / 1000)
              })
              .where(
                and(
                  eq(dbSchema.events.id, eventIdNum),
                  // Only increment if we haven't reached capacity
                  sql`${dbSchema.events.currentParticipants} < ${eventData.maxParticipants}`
                )
              );

            //Verify the update succeeded by checking if count was actually incremented
            // If we hit capacity, the WHERE clause prevented the update
            const verifyEvent = await ctx.db
              .select()
              .from(dbSchema.events)
              .where(eq(dbSchema.events.id, eventIdNum))
              .limit(1);

            // Check if currentParticipants was actually incremented
            // If it's still at or above maxParticipants, the conditional update failed
            const currentCount = verifyEvent[0]?.currentParticipants || 0;
            if (currentCount > eventData.maxParticipants) {
              // Rollback: Delete the registration we just inserted
              await ctx.db
                .delete(dbSchema.eventParticipants)
                .where(
                  and(
                    eq(dbSchema.eventParticipants.eventId, eventIdNum),
                    eq(dbSchema.eventParticipants.userId, ctx.user.id),
                    eq(dbSchema.eventParticipants.status, 'registered')
                  )
                );
              
              return {
                success: false,
                message: 'Event is at full capacity',
              };
            }
          } else {
            // No capacity limit - just increment the counter
            await ctx.db
              .update(dbSchema.events)
              .set({ 
                currentParticipants: sql`${dbSchema.events.currentParticipants} + 1`,
                updatedAt: Math.floor(Date.now() / 1000)
              })
              .where(eq(dbSchema.events.id, eventIdNum));
          }

          // Log successful registration for audit trail
          console.log('Event registration successful:', {
            eventId: eventIdNum,
            eventTitle: eventData.title,
            userId: ctx.user.id,
            userName: ctx.user.name,
            timestamp: new Date().toISOString()
          });

          // Fetch updated event data
          const updatedEvent = await ctx.db
            .select()
            .from(dbSchema.events)
            .where(eq(dbSchema.events.id, eventIdNum))
            .limit(1);

          return {
            success: true,
            message: 'Successfully registered for the event',
            event: updatedEvent[0],
          };
        } catch (error: any) {
          // Log error with context for debugging
          console.error('Error registering for event:', {
            eventId: eventIdNum,
            userId: ctx.user.id,
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
          });
          
          return {
            success: false,
            message: 'An error occurred while registering for the event',
          };
        }
      },
    }),

    // Cancel event registration
    cancelEventRegistration: t.field({
      type: EventRegistrationResultType,
      args: {
        eventId: t.arg.id({ required: true }),
      },
      resolve: async (_, { eventId }, ctx) => {
        // Authorization: User must be authenticated
        if (!ctx.user) {
          return {
            success: false,
            message: 'You must be logged in to cancel registrations',
          };
        }

        const eventIdNum = parseInt(eventId);
        if (isNaN(eventIdNum)) {
          return {
            success: false,
            message: 'Invalid event ID',
          };
        }

        // Fetch the event
        const event = await ctx.db
          .select()
          .from(dbSchema.events)
          .where(eq(dbSchema.events.id, eventIdNum))
          .limit(1);

        if (!event.length) {
          return {
            success: false,
            message: 'Event not found',
          };
        }

        // Find user's registration
        const registration = await ctx.db
          .select()
          .from(dbSchema.eventParticipants)
          .where(
            and(
              eq(dbSchema.eventParticipants.eventId, eventIdNum),
              eq(dbSchema.eventParticipants.userId, ctx.user.id),
              inArray(dbSchema.eventParticipants.status, ACTIVE_PARTICIPANT_STATUSES)
            )
          )
          .limit(1);

        if (!registration.length) {
          return {
            success: false,
            message: 'You are not registered for this event',
          };
        }

        // Update registration status to 'cancelled' and decrement currentParticipants
        try {
          // Update registration status
          await ctx.db
            .update(dbSchema.eventParticipants)
            .set({ status: 'cancelled' })
            .where(eq(dbSchema.eventParticipants.id, registration[0].id));

          // Decrement currentParticipants & Ensure it doesn't go below 0
          await ctx.db
            .update(dbSchema.events)
            .set({ 
              currentParticipants: sql`MAX(0, ${dbSchema.events.currentParticipants} - 1)`,
              updatedAt: Math.floor(Date.now() / 1000)
            })
            .where(eq(dbSchema.events.id, eventIdNum));

          // Log successful cancellation for audit trail
          console.log('Event registration cancelled:', {
            eventId: eventIdNum,
            eventTitle: event[0].title,
            userId: ctx.user.id,
            userName: ctx.user.name,
            timestamp: new Date().toISOString()
          });

          // Fetch updated event data
          const updatedEvent = await ctx.db
            .select()
            .from(dbSchema.events)
            .where(eq(dbSchema.events.id, eventIdNum))
            .limit(1);

          return {
            success: true,
            message: 'Successfully cancelled your registration',
            event: updatedEvent[0],
          };
        } catch (error: any) {
          // Log error with context for debugging
          console.error('Error cancelling registration:', {
            eventId: eventIdNum,
            userId: ctx.user.id,
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
          });
          
          return {
            success: false,
            message: 'An error occurred while cancelling your registration',
          };
        }
      },
    }),
  }),
});

// Build and export schema
export function createSchema() {
  return builder.toSchema();
}

// Export SDL string representation
export function createSchemaSDL() {
  const schema = builder.toSchema();
  return printSchema(schema);
} 