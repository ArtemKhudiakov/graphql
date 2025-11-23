import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLSchema,
} from 'graphql';
import { UUIDType } from './types/uuid.js';
import { MemberTypeId } from '../member-types/schemas.js';

export const MemberTypeIdEnum = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    BASIC: { value: MemberTypeId.BASIC },
    BUSINESS: { value: MemberTypeId.BUSINESS },
  },
});

export const MemberType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    discount: { type: new GraphQLNonNull(GraphQLFloat) },
    postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

export const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
  }),
});


export const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: () => ({
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  }),
});

export const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: () => ({
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    memberTypeId: { type: MemberTypeIdEnum },
  }),
});

export const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: () => ({
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  }),
});

export const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: () => ({
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  }),
});

export const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: () => ({
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(UUIDType) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeIdEnum) },
  }),
});

export const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
});

export const createSchema = (prisma: any) => {
  const ProfileWithResolvers = new GraphQLObjectType({
    name: 'Profile',
    fields: () => ({
      id: { type: new GraphQLNonNull(UUIDType) },
      isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
      yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
      memberType: {
        type: new GraphQLNonNull(MemberType),
        resolve: async (parent: { memberTypeId: string }) => {
          return prisma.memberType.findUnique({
            where: { id: parent.memberTypeId },
          });
        },
      },
    }),
  });

  const User = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
      id: { type: new GraphQLNonNull(UUIDType) },
      name: { type: new GraphQLNonNull(GraphQLString) },
      balance: { type: new GraphQLNonNull(GraphQLFloat) },
      profile: {
        type: ProfileWithResolvers,
        resolve: async (parent: { id: string }) => {
          return prisma.profile.findUnique({
            where: { userId: parent.id },
          });
        },
      },
      posts: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
        resolve: async (parent: { id: string }) => {
          return prisma.post.findMany({
            where: { authorId: parent.id },
          });
        },
      },
      userSubscribedTo: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async (parent: { id: string }) => {
          const subscriptions = await prisma.subscribersOnAuthors.findMany({
            where: { subscriberId: parent.id },
            select: { authorId: true },
          });
          const authorIds = subscriptions.map((s) => s.authorId);
          if (authorIds.length === 0) {
            return [];
          }
          return prisma.user.findMany({
            where: { id: { in: authorIds } },
          });
        },
      },
      subscribedToUser: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async (parent: { id: string }) => {
          const subscriptions = await prisma.subscribersOnAuthors.findMany({
            where: { authorId: parent.id },
            select: { subscriberId: true },
          });
          const subscriberIds = subscriptions.map((s) => s.subscriberId);
          if (subscriberIds.length === 0) {
            return [];
          }
          return prisma.user.findMany({
            where: { id: { in: subscriberIds } },
          });
        },
      },
    }),
  });

  const RootQueryTypeWithResolvers = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: () => ({
      memberTypes: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberType))),
        resolve: async () => {
          return prisma.memberType.findMany();
        },
      },
      memberType: {
        type: MemberType,
        args: {
          id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
        },
        resolve: async (_: unknown, args: { id: string }) => {
          return prisma.memberType.findUnique({
            where: { id: args.id },
          });
        },
      },
      users: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async () => {
          return prisma.user.findMany();
        },
      },
      user: {
        type: User,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { id: string }) => {
          return prisma.user.findUnique({
            where: { id: args.id },
          });
        },
      },
      posts: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
        resolve: async () => {
          return prisma.post.findMany();
        },
      },
      post: {
        type: Post,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { id: string }) => {
          return prisma.post.findUnique({
            where: { id: args.id },
          });
        },
      },
      profiles: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ProfileWithResolvers))),
        resolve: async () => {
          return prisma.profile.findMany();
        },
      },
      profile: {
        type: ProfileWithResolvers,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { id: string }) => {
          return prisma.profile.findUnique({
            where: { id: args.id },
          });
        },
      },
    }),
  });

  const MutationsWithResolvers = new GraphQLObjectType({
    name: 'Mutations',
    fields: () => ({
      createUser: {
        type: new GraphQLNonNull(User),
        args: {
          dto: { type: new GraphQLNonNull(CreateUserInput) },
        },
        resolve: async (_: unknown, args: { dto: { name: string; balance: number } }) => {
          return prisma.user.create({
            data: args.dto,
          });
        },
      },
      createProfile: {
        type: new GraphQLNonNull(ProfileWithResolvers),
        args: {
          dto: { type: new GraphQLNonNull(CreateProfileInput) },
        },
        resolve: async (
          _: unknown,
          args: {
            dto: {
              isMale: boolean;
              yearOfBirth: number;
              userId: string;
              memberTypeId: string;
            };
          },
        ) => {
          return prisma.profile.create({
            data: args.dto,
          });
        },
      },
      createPost: {
        type: new GraphQLNonNull(Post),
        args: {
          dto: { type: new GraphQLNonNull(CreatePostInput) },
        },
        resolve: async (
          _: unknown,
          args: {
            dto: {
              title: string;
              content: string;
              authorId: string;
            };
          },
        ) => {
          return prisma.post.create({
            data: args.dto,
          });
        },
      },
      changePost: {
        type: new GraphQLNonNull(Post),
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: new GraphQLNonNull(ChangePostInput) },
        },
        resolve: async (
          _: unknown,
          args: {
            id: string;
            dto: {
              title?: string;
              content?: string;
            };
          },
        ) => {
          return prisma.post.update({
            where: { id: args.id },
            data: args.dto,
          });
        },
      },
      changeProfile: {
        type: new GraphQLNonNull(ProfileWithResolvers),
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: new GraphQLNonNull(ChangeProfileInput) },
        },
        resolve: async (
          _: unknown,
          args: {
            id: string;
            dto: {
              isMale?: boolean;
              yearOfBirth?: number;
              memberTypeId?: string;
            };
          },
        ) => {
          return prisma.profile.update({
            where: { id: args.id },
            data: args.dto,
          });
        },
      },
      changeUser: {
        type: new GraphQLNonNull(User),
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: new GraphQLNonNull(ChangeUserInput) },
        },
        resolve: async (
          _: unknown,
          args: {
            id: string;
            dto: {
              name?: string;
              balance?: number;
            };
          },
        ) => {
          return prisma.user.update({
            where: { id: args.id },
            data: args.dto,
          });
        },
      },
      deleteUser: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { id: string }) => {
          await prisma.user.delete({
            where: { id: args.id },
          });
          return 'deleted';
        },
      },
      deletePost: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { id: string }) => {
          await prisma.post.delete({
            where: { id: args.id },
          });
          return 'deleted';
        },
      },
      deleteProfile: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { id: string }) => {
          await prisma.profile.delete({
            where: { id: args.id },
          });
          return 'deleted';
        },
      },
      subscribeTo: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          userId: { type: new GraphQLNonNull(UUIDType) },
          authorId: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { userId: string; authorId: string }) => {
          await prisma.subscribersOnAuthors.create({
            data: {
              subscriberId: args.userId,
              authorId: args.authorId,
            },
          });
          return 'subscribed';
        },
      },
      unsubscribeFrom: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          userId: { type: new GraphQLNonNull(UUIDType) },
          authorId: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { userId: string; authorId: string }) => {
          await prisma.subscribersOnAuthors.delete({
            where: {
              subscriberId_authorId: {
                subscriberId: args.userId,
                authorId: args.authorId,
              },
            },
          });
          return 'unsubscribed';
        },
      },
    }),
  });

  return new GraphQLSchema({
    query: RootQueryTypeWithResolvers,
    mutation: MutationsWithResolvers,
  });
};

