import { db, auth } from '../firebase-config.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as _limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';

const MILESTONES_COLLECTION = 'milestones';

function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('未登入，無法操作貼文');
  return user;
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((a) => a && a.url)
    .map((a) => ({
      type: a.type || 'file',
      url: a.url,
      name: a.name || null,
      contentType: a.contentType || null,
      storagePath: a.storagePath || null
    }));
}

function normalizeVisibility(visibility) {
  return visibility === 'supporters' ? 'supporters' : 'public';
}

function normalizeTitle(title, content = '') {
  const t = (title || '').trim();
  if (t) return t;
  const firstLine = (content || '').trim().split('\n').find(Boolean) || '';
  return firstLine.slice(0, 64) || '未命名貼文';
}

function getPrimaryMediaType(attachments = []) {
  const first = Array.isArray(attachments) ? attachments.find((a) => a && a.type) : null;
  return first ? first.type : 'text';
}

function buildPostPayload(raw = {}) {
  const content = (raw.content || '').trim();
  const attachments = normalizeAttachments(raw.attachments);
  return {
    title: normalizeTitle(raw.title, content),
    content,
    visibility: normalizeVisibility(raw.visibility),
    attachments,
    primaryMediaType: raw.primaryMediaType || getPrimaryMediaType(attachments),
    allowedUids: Array.isArray(raw.allowedUids) ? raw.allowedUids.filter(Boolean) : []
  };
}

const PostsService = {
  createDraft: async (milestoneId, rawPost = {}) => {
    const user = getCurrentUser();
    if (!milestoneId) throw new Error('缺少里程碑 ID，無法儲存草稿');

    const post = buildPostPayload(rawPost);
    if (!post.content && post.attachments.length === 0) {
      throw new Error('貼文內容與附件不可同時為空');
    }

    const payload = {
      ...post,
      milestoneId,
      vtuberId: user.uid,
      status: 'draft',
      isExclusive: post.visibility === 'supporters',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: null
    };

    const docRef = await addDoc(collection(db, MILESTONES_COLLECTION, milestoneId, 'posts'), payload);
    return { id: docRef.id, milestoneId };
  },

  updateDraft: async (milestoneId, postId, rawPost = {}) => {
    getCurrentUser();
    if (!milestoneId || !postId) throw new Error('缺少貼文資訊，無法更新草稿');

    const post = buildPostPayload(rawPost);
    const payload = {
      ...post,
      isExclusive: post.visibility === 'supporters',
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, MILESTONES_COLLECTION, milestoneId, 'posts', postId), payload);
    return true;
  },

  publish: async (milestoneId, postId) => {
    getCurrentUser();
    if (!milestoneId || !postId) throw new Error('缺少貼文資訊，無法發布');

    await updateDoc(doc(db, MILESTONES_COLLECTION, milestoneId, 'posts', postId), {
      status: 'published',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  },

  delete: async (milestoneId, postId) => {
    getCurrentUser();
    if (!milestoneId || !postId) throw new Error('缺少貼文資訊，無法刪除');

    await deleteDoc(doc(db, MILESTONES_COLLECTION, milestoneId, 'posts', postId));
    return true;
  },

  getPostsByMilestone: async (milestoneId, opts = {}) => {
    getCurrentUser();
    if (!milestoneId) throw new Error('缺少里程碑 ID，無法讀取貼文');

    const { includeDrafts = true, limit = 50 } = opts;
    const postsRef = collection(db, MILESTONES_COLLECTION, milestoneId, 'posts');
    const constraints = [];

    if (!includeDrafts) {
      constraints.push(where('status', '==', 'published'));
      constraints.push(orderBy('publishedAt', 'desc'));
    } else {
      constraints.push(orderBy('createdAt', 'desc'));
    }
    constraints.push(_limit(limit));

    const snap = await getDocs(query(postsRef, ...constraints));
    return snap.docs.map((d) => ({ id: d.id, milestoneId, ...d.data() }));
  },

  getPublishedPostsByMilestone: async (milestoneId, opts = {}) => {
    if (!milestoneId) throw new Error('缺少里程碑 ID，無法讀取已發布貼文');

    const {
      limit = 20,
      tryIncludeSupporters = false
    } = opts;

    const postsRef = collection(db, MILESTONES_COLLECTION, milestoneId, 'posts');
    const byId = new Map();

    const collect = async (qBuilder) => {
      const snap = await getDocs(qBuilder(postsRef));
      snap.docs.forEach((d) => {
        byId.set(d.id, { id: d.id, milestoneId, ...d.data() });
      });
    };

    if (tryIncludeSupporters) {
      try {
        await collect((ref) => query(ref, where('status', '==', 'published'), _limit(limit)));
      } catch (err) {
        // Public viewers may not have access to supporter-only posts; fallback below.
      }
    }

    if (byId.size === 0) {
      try {
        await collect((ref) => query(ref, where('status', '==', 'published'), where('visibility', '==', 'public'), _limit(limit)));
      } catch (err) {
        // ignore and try legacy field fallback
      }

      try {
        await collect((ref) => query(ref, where('status', '==', 'published'), where('isExclusive', '==', false), _limit(limit)));
      } catch (err) {
        // ignore
      }
    }

    return Array.from(byId.values())
      .sort((a, b) => (toMillis(b.publishedAt) || toMillis(b.updatedAt) || toMillis(b.createdAt)) - (toMillis(a.publishedAt) || toMillis(a.updatedAt) || toMillis(a.createdAt)))
      .slice(0, limit);
  },

  listCreatorPosts: async (opts = {}) => {
    const user = getCurrentUser();
    const {
      milestoneId = null,
      includeDrafts = true,
      limitPerMilestone = 50
    } = opts;

    let milestones = [];
    if (milestoneId) {
      milestones = [{ id: milestoneId, title: '' }];
    } else {
      const q = query(collection(db, MILESTONES_COLLECTION), where('vtuberId', '==', user.uid));
      const snap = await getDocs(q);
      milestones = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || '未命名里程碑'
      }));
    }

    const batches = await Promise.all(
      milestones.map(async (m) => {
        const posts = await PostsService.getPostsByMilestone(m.id, {
          includeDrafts,
          limit: limitPerMilestone
        });
        return posts.map((p) => ({
          ...p,
          milestoneTitle: m.title || p.milestoneTitle || '未命名里程碑',
          __sortAt: toMillis(p.publishedAt) || toMillis(p.updatedAt) || toMillis(p.createdAt)
        }));
      })
    );

    return batches
      .flat()
      .sort((a, b) => b.__sortAt - a.__sortAt)
      .map(({ __sortAt, ...rest }) => rest);
  }
};

window.PostsService = PostsService;

export default PostsService;
