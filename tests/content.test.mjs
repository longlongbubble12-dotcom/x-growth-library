import test from 'node:test';
import assert from 'node:assert/strict';
import { posts, historicalCases, topics } from '../web/data.js';

test('historical cases have matching original/archive identities and explicit review boundaries', () => {
  assert.ok(historicalCases.length >= 2);
  for (const post of historicalCases) {
    assert.equal(post.kind, 'historical');
    assert.equal(post.topic, 'business');
    assert.equal(post.reviewStatus, 'needs_review');
    assert.equal(post.source.access, 'archive_read');
    const original = new URL(post.source.originalUrl);
    const archive = new URL(post.source.archiveUrl);
    assert.equal(original.protocol, 'https:');
    assert.equal(original.hostname, 'x.com');
    assert.equal(archive.hostname, 'threadreaderapp.com');
    assert.ok(original.pathname.endsWith(`/status/${post.source.postId}`));
    assert.ok(archive.pathname.endsWith(`/thread/${post.source.postId}.html`));
    assert.equal(original.pathname.split('/')[1].toLowerCase(), post.author.slice(1).toLowerCase());
    assert.ok(post.source.notice && post.source.promotion);
    assert.ok(post.editorialConclusion && post.unsupported.length && post.limitations.length);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(post.publishedAt));
    assert.equal(date, post.date, post.id);
    for (const claim of post.claims) {
      assert.ok(['archive', 'supplement'].includes(claim.source));
      if (claim.source === 'supplement') assert.ok(post.source.supplementUrl);
      assert.ok(claim.value && claim.label && claim.context);
    }
  }
});

test('fictional content stays distinguishable and is excluded from the real business category', () => {
  const demo = posts.filter(post => post.kind === 'demo');
  assert.ok(demo.length > 0);
  for (const post of demo) {
    assert.match(post.author, /^@demo_/);
    assert.equal(post.source, undefined);
    assert.notEqual(post.topic, 'business');
  }
  assert.ok(posts.filter(post => post.topic === 'business').every(post => post.kind === 'historical'));
  assert.equal(new Set(posts.map(post => post.id)).size, posts.length);
  for (const post of posts) {
    assert.ok(topics.some(topic => topic.id === post.topic));
    if (post.recipe) {
      const variables = [...post.recipe.template.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]);
      assert.deepEqual(new Set(variables), new Set(post.recipe.inputs.map(input => input.key)));
    }
  }
});
