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
  GraphQLResolveInfo,
} from 'graphql';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
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
        resolve: async (parent: { memberTypeId: string }, _: unknown, context: any) => {
          return context.loaders.memberTypeLoader.load(parent.memberTypeId);
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
        resolve: async (parent: { id: string }, _: unknown, context: any) => {
          return context.loaders.profileByUserIdLoader.load(parent.id);
        },
      },
      posts: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
        resolve: async (parent: { id: string }, _: unknown, context: any) => {
          return context.loaders.postsByAuthorIdLoader.load(parent.id);
        },
      },
      userSubscribedTo: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async (parent: { id: string }, _: unknown, context: any) => {
          return context.loaders.userSubscribedToLoader.load(parent.id);
        },
      },
      subscribedToUser: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async (parent: { id: string }, _: unknown, context: any) => {
          return context.loaders.subscribedToUserLoader.load(parent.id);
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
        resolve: async (_: unknown, args: { id: string }, context: any) => {
          return context.loaders.memberTypeLoader.load(args.id);
        },
      },
      users: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async (_: unknown, __: unknown, context: any, info: GraphQLResolveInfo) => {
          const parsedInfo = parseResolveInfo(info) as any;
          const userFields: Record<string, any> | undefined = parsedInfo?.fieldsByTypeName?.User;

          const needsUserSubscribedTo = Boolean(userFields?.userSubscribedTo);
          const needsSubscribedToUser = Boolean(userFields?.subscribedToUser);

          const include: any = {};
          if (needsUserSubscribedTo) {
            include.userSubscribedTo = true;
          }
          if (needsSubscribedToUser) {
            include.subscribedToUser = true;
          }

          const queryOptions: any = {};
          if (Object.keys(include).length > 0) {
            queryOptions.include = include;
          }

          const users = await prisma.user.findMany(queryOptions);

          const userMap = new Map(users.map((user: any) => [user.id, user]));
          context.loadedUsers = userMap;

          const relatedUserIds = new Set<string>();
          for (const user of users) {
            context.loaders.userLoader.prime(user.id, user);

            if (user.userSubscribedTo) {
              for (const sub of user.userSubscribedTo) {
                relatedUserIds.add(sub.authorId);
              }
            }

            if (user.subscribedToUser) {
              for (const sub of user.subscribedToUser) {
                relatedUserIds.add(sub.subscriberId);
              }
            }
          }

          if (relatedUserIds.size > 0) {
            const idsArray = Array.from(relatedUserIds).filter(
              (id) => !context.loadedUsers.has(id),
            );
            if (idsArray.length > 0) {
              const relatedUsers = await prisma.user.findMany({
                where: { id: { in: idsArray } },
              });
              for (const relatedUser of relatedUsers) {
                context.loaders.userLoader.prime(relatedUser.id, relatedUser);
                context.loadedUsers.set(relatedUser.id, relatedUser);
              }
            }
          }

          return users;
        },
      },
      user: {
        type: User,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_: unknown, args: { id: string }, context: any) => {
          return context.loaders.userLoader.load(args.id);
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
        resolve: async (_: unknown, args: { id: string }, context: any) => {
          return context.loaders.postLoader.load(args.id);
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
        resolve: async (_: unknown, args: { id: string }, context: any) => {
          return context.loaders.profileLoader.load(args.id);
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

