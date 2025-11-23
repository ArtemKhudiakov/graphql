import DataLoader from 'dataloader';
import type { PrismaClient } from '@prisma/client';

export const createLoaders = (prisma: PrismaClient, context?: any) => {
  const userLoader = new DataLoader<string, any>(async (ids) => {
    const loadedUsers = context?.loadedUsers as Map<string, any> | undefined;
    const missingIds = loadedUsers 
      ? ids.filter((id) => !loadedUsers.has(id))
      : ids;
    
    if (missingIds.length === 0 && loadedUsers) {
      return ids.map((id) => loadedUsers.get(id) || null);
    }
    
    if (missingIds.length === 0) {
      return ids.map((id) => loadedUsers?.get(id) || null);
    }
    
    const users = await prisma.user.findMany({
      where: { id: { in: [...missingIds] } },
    });
    
    const userMap = new Map(users.map((user) => [user.id, user]));
    if (loadedUsers) {
      for (const [id, user] of loadedUsers) {
        if (!userMap.has(id)) {
          userMap.set(id, user);
        }
      }
    }
    
    return ids.map((id) => userMap.get(id) || null);
  });

  const userSubscribedToLoader = new DataLoader<string, any[]>(async (subscriberIds) => {
    const subscriptions = await prisma.subscribersOnAuthors.findMany({
      where: { subscriberId: { in: [...subscriberIds] } },
      select: { subscriberId: true, authorId: true },
    });
    const authorIds = [...new Set(subscriptions.map((s) => s.authorId))];
    if (authorIds.length === 0) {
      return subscriberIds.map(() => []);
    }
    const authors = await userLoader.loadMany(authorIds);
    const authorMap = new Map<string, any>();
    for (const author of authors) {
      if (author && author.id) {
        authorMap.set(author.id, author);
      }
    }
    const subscriptionsBySubscriber = new Map<string, any[]>();
    for (const subscriberId of subscriberIds) {
      subscriptionsBySubscriber.set(subscriberId, []);
    }
    for (const sub of subscriptions) {
      const author = authorMap.get(sub.authorId);
      if (author) {
        const subscriberSubs = subscriptionsBySubscriber.get(sub.subscriberId) || [];
        subscriberSubs.push(author);
      }
    }
    return subscriberIds.map((subscriberId) => subscriptionsBySubscriber.get(subscriberId) || []);
  });

  const subscribedToUserLoader = new DataLoader<string, any[]>(async (authorIds) => {
    const subscriptions = await prisma.subscribersOnAuthors.findMany({
      where: { authorId: { in: [...authorIds] } },
      select: { subscriberId: true, authorId: true },
    });
    const subscriberIds = [...new Set(subscriptions.map((s) => s.subscriberId))];
    if (subscriberIds.length === 0) {
      return authorIds.map(() => []);
    }
    const subscribers = await userLoader.loadMany(subscriberIds);
    const subscriberMap = new Map<string, any>();
    for (const subscriber of subscribers) {
      if (subscriber && subscriber.id) {
        subscriberMap.set(subscriber.id, subscriber);
      }
    }
    const subscriptionsByAuthor = new Map<string, any[]>();
    for (const authorId of authorIds) {
      subscriptionsByAuthor.set(authorId, []);
    }
    for (const sub of subscriptions) {
      const subscriber = subscriberMap.get(sub.subscriberId);
      if (subscriber) {
        const authorSubs = subscriptionsByAuthor.get(sub.authorId) || [];
        authorSubs.push(subscriber);
      }
    }
    return authorIds.map((authorId) => subscriptionsByAuthor.get(authorId) || []);
  });

  const postLoader = new DataLoader<string, any>(async (ids) => {
    const posts = await prisma.post.findMany({
      where: { id: { in: [...ids] } },
    });
    const postMap = new Map(posts.map((post) => [post.id, post]));
    return ids.map((id) => postMap.get(id) || null);
  });

  const profileLoader = new DataLoader<string, any>(async (ids) => {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: [...ids] } },
    });
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    return ids.map((id) => profileMap.get(id) || null);
  });

  const profileByUserIdLoader = new DataLoader<string, any>(async (userIds) => {
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: [...userIds] } },
    });
    const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));
    return userIds.map((userId) => profileMap.get(userId) || null);
  });

  const memberTypeLoader = new DataLoader<string, any>(async (ids) => {
    const memberTypes = await prisma.memberType.findMany({
      where: { id: { in: [...ids] } },
    });
    const memberTypeMap = new Map(memberTypes.map((mt) => [mt.id, mt]));
    return ids.map((id) => memberTypeMap.get(id) || null);
  });

  const postsByAuthorIdLoader = new DataLoader<string, any[]>(async (authorIds) => {
    const posts = await prisma.post.findMany({
      where: { authorId: { in: [...authorIds] } },
    });
    const postsByAuthor = new Map<string, any[]>();
    for (const authorId of authorIds) {
      postsByAuthor.set(authorId, []);
    }
    for (const post of posts) {
      const authorPosts = postsByAuthor.get(post.authorId) || [];
      authorPosts.push(post);
    }
    return authorIds.map((authorId) => postsByAuthor.get(authorId) || []);
  });

  return {
    userLoader,
    postLoader,
    profileLoader,
    profileByUserIdLoader,
    memberTypeLoader,
    postsByAuthorIdLoader,
    userSubscribedToLoader,
    subscribedToUserLoader,
  };
};

