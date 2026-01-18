import { z } from 'zod';

// ============ Auth Schemas ============

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be less than 100 characters')
    .optional(),
});

export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
});

// ============ Profile Schemas ============

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .max(100, 'Display name must be less than 100 characters')
    .optional()
    .nullable(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional()
    .nullable(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().nullable(),
  timezone: z.string().max(50).optional(),
  locationCity: z.string().max(100).optional().nullable(),
});

// ============ Event Schemas ============

export const eventPrivacyEnum = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']);
export const eventStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']);
export const eventCategoryEnum = z.enum([
  'music',
  'sports',
  'food-drink',
  'arts',
  'networking',
  'classes',
  'outdoors',
  'games',
  'community',
  'other',
]);

export const locationSchema = z.object({
  name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const createEventSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
  startTime: z.string().datetime('Please provide a valid date and time'),
  endTime: z.string().datetime().optional().nullable(),
  timezone: z.string().min(1, 'Timezone is required'),
  isOnline: z.boolean().default(false),
  onlineUrl: z.string().url().max(500).optional().nullable(),
  location: locationSchema.optional().nullable(),
  privacy: eventPrivacyEnum.default('PRIVATE'),
  requireApproval: z.boolean().default(false),
  allowPlusOnes: z.boolean().default(true),
  maxPlusOnes: z.number().int().min(0).max(10).default(5),
  capacity: z.number().int().min(1).max(10000).optional().nullable(),
  enableWaitlist: z.boolean().default(true),
  enableComments: z.boolean().default(true),
  guestListVisible: z.boolean().default(true),
  category: eventCategoryEnum.optional().nullable(),
  coverImageUrl: z.string().url().max(500).optional().nullable(),
  communityId: z.string().uuid().optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial();

export const publishEventSchema = z.object({
  id: z.string().uuid(),
});

// ============ RSVP Schemas ============

export const rsvpStatusEnum = z.enum(['GOING', 'MAYBE', 'NOT_GOING']);

export const createRsvpSchema = z.object({
  status: rsvpStatusEnum,
  plusOnes: z.number().int().min(0).max(10).default(0),
  occurrenceId: z.string().uuid().optional().nullable(),
});

// ============ Invite Schemas ============

export const inviteTypeEnum = z.enum(['STANDARD', 'VIP']);

export const sendInvitesSchema = z.object({
  recipients: z.array(
    z.object({
      email: emailSchema,
    })
  ).min(1, 'At least one recipient is required').max(100, 'Maximum 100 invites at a time'),
  message: z.string().max(500).optional().nullable(),
  type: inviteTypeEnum.default('STANDARD'),
});

// ============ Post Schemas ============

export const postTypeEnum = z.enum(['UPDATE', 'ANNOUNCEMENT', 'QUESTION']);

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  type: postTypeEnum.default('UPDATE'),
  isPinned: z.boolean().default(false),
});

export const updatePostSchema = createPostSchema.partial();

// ============ Comment Schemas ============

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1000, 'Comment must be less than 1000 characters'),
  parentId: z.string().uuid().optional().nullable(),
});

// ============ Reaction Schemas ============

export const reactionEmojiEnum = z.enum(['👍', '❤️', '😂', '😮', '🎉']);

export const createReactionSchema = z.object({
  emoji: reactionEmojiEnum,
});

// ============ Community Schemas ============

export const communityPrivacyEnum = z.enum(['PUBLIC', 'PRIVATE']);

export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must be less than 200 characters'),
  description: z.string().max(1000).optional().nullable(),
  privacy: communityPrivacyEnum.default('PUBLIC'),
  coverImageUrl: z.string().url().max(500).optional().nullable(),
});

export const updateCommunitySchema = createCommunitySchema.partial();

// ============ Report Schemas ============

export const reportReasonEnum = z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'FAKE', 'OTHER']);

export const createReportSchema = z.object({
  entityType: z.enum(['event', 'user', 'post', 'comment']),
  entityId: z.string().uuid(),
  reason: reportReasonEnum,
  details: z.string().max(1000).optional().nullable(),
});

// ============ Search/Filter Schemas ============

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export const eventFiltersSchema = z.object({
  category: eventCategoryEnum.optional(),
  privacy: eventPrivacyEnum.optional(),
  startAfter: z.string().datetime().optional(),
  startBefore: z.string().datetime().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(500).default(50),
  q: z.string().max(100).optional(),
  sort: z.enum(['-start_time', 'start_time', 'distance', 'popularity']).default('-start_time'),
});

export const searchEventsSchema = paginationSchema.merge(eventFiltersSchema);

// ============ Type exports ============

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerify = z.infer<typeof magicLinkVerifySchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type CreateEvent = z.infer<typeof createEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
export type CreateRsvp = z.infer<typeof createRsvpSchema>;
export type SendInvites = z.infer<typeof sendInvitesSchema>;
export type CreatePost = z.infer<typeof createPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type CreateReaction = z.infer<typeof createReactionSchema>;
export type CreateCommunity = z.infer<typeof createCommunitySchema>;
export type UpdateCommunity = z.infer<typeof updateCommunitySchema>;
export type CreateReport = z.infer<typeof createReportSchema>;
export type SearchEvents = z.infer<typeof searchEventsSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
