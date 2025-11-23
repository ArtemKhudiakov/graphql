import { GraphQLResolveInfo } from 'graphql';
import type { PrismaClient } from '@prisma/client';
import { MemberTypeId } from '../member-types/schemas.js';

export const createResolvers = (prisma: PrismaClient) => {
  const queryResolvers = {
    memberTypes: async () => {
      return prisma.memberType.findMany();
    },

    memberType: async (_: unknown, args: { id: string }) => {
      return prisma.memberType.findUnique({
        where: { id: args.id },
      });
    },

    users: async () => {
      return prisma.user.findMany();
    },

    user: async (_: unknown, args: { id: string }) => {
      return prisma.user.findUnique({
        where: { id: args.id },
      });
    },

    posts: async () => {
      return prisma.post.findMany();
    },

    post: async (_: unknown, args: { id: string }) => {
      return prisma.post.findUnique({
        where: { id: args.id },
      });
    },

    profiles: async () => {
      return prisma.profile.findMany();
    },

    profile: async (_: unknown, args: { id: string }) => {
      return prisma.profile.findUnique({
        where: { id: args.id },
      });
    },
  };

  const typeResolvers = {
    User: {
      profile: async (parent: { id: string }) => {
        return prisma.profile.findUnique({
          where: { userId: parent.id },
        });
      },

      posts: async (parent: { id: string }) => {
        return prisma.post.findMany({
          where: { authorId: parent.id },
        });
      },

      userSubscribedTo: async (parent: { id: string }) => {
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

      subscribedToUser: async (parent: { id: string }) => {
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

    Profile: {
      memberType: async (parent: { memberTypeId: string }) => {
        return prisma.memberType.findUnique({
          where: { id: parent.memberTypeId },
        });
      },
    },
  };

  const mutationResolvers = {
    createUser: async (_: unknown, args: { dto: { name: string; balance: number } }) => {
      return prisma.user.create({
        data: args.dto,
      });
    },

    createProfile: async (
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

    createPost: async (
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

    changePost: async (
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

    changeProfile: async (
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

    changeUser: async (
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

    deleteUser: async (_: unknown, args: { id: string }) => {
      await prisma.user.delete({
        where: { id: args.id },
      });
      return 'deleted';
    },

    deletePost: async (_: unknown, args: { id: string }) => {
      await prisma.post.delete({
        where: { id: args.id },
      });
      return 'deleted';
    },

    deleteProfile: async (_: unknown, args: { id: string }) => {
      await prisma.profile.delete({
        where: { id: args.id },
      });
      return 'deleted';
    },

    subscribeTo: async (_: unknown, args: { userId: string; authorId: string }) => {
      await prisma.subscribersOnAuthors.create({
        data: {
          subscriberId: args.userId,
          authorId: args.authorId,
        },
      });
      return 'subscribed';
    },

    unsubscribeFrom: async (_: unknown, args: { userId: string; authorId: string }) => {
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
  };

  return {
    RootQueryType: queryResolvers,
    Mutations: mutationResolvers,
    ...typeResolvers,
  };
};

