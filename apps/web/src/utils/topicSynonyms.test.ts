import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapFrameworkToTopic, getTopicSynonyms, isRecognizedTopic } from './topicSynonyms';

describe('topicSynonyms framework dictionary', () => {
  describe('mapFrameworkToTopic', () => {
    it('maps top frontend frameworks to GitHub topics', () => {
      assert.deepEqual(mapFrameworkToTopic('React'), ['react', 'reactjs']);
      assert.deepEqual(mapFrameworkToTopic('next.js'), ['nextjs', 'next-js', 'react']);
      assert.deepEqual(mapFrameworkToTopic('Vue'), ['vue', 'vuejs']);
      assert.deepEqual(mapFrameworkToTopic('Svelte'), ['svelte', 'sveltekit']);
      assert.deepEqual(mapFrameworkToTopic('TailwindCSS'), ['tailwindcss', 'tailwind', 'css']);
    });

    it('maps top backend frameworks to GitHub topics', () => {
      assert.deepEqual(mapFrameworkToTopic('FastAPI'), ['fastapi', 'python']);
      assert.deepEqual(mapFrameworkToTopic('Django'), ['django', 'python']);
      assert.deepEqual(mapFrameworkToTopic('Express'), ['express', 'expressjs', 'nodejs']);
      assert.deepEqual(mapFrameworkToTopic('Spring Boot'), ['spring-boot', 'spring', 'java']);
      assert.deepEqual(mapFrameworkToTopic('Ruby on Rails'), ['rails', 'ruby-on-rails', 'ruby']);
      assert.deepEqual(mapFrameworkToTopic('Actix'), ['actix', 'actix-web', 'rust']);
    });

    it('is case-insensitive and trims whitespace', () => {
      assert.deepEqual(mapFrameworkToTopic('  REACT  '), ['react', 'reactjs']);
      assert.deepEqual(mapFrameworkToTopic('FASTAPI'), ['fastapi', 'python']);
      assert.deepEqual(mapFrameworkToTopic('django'), ['django', 'python']);
    });

    it('returns empty array for unknown or invalid frameworks', () => {
      assert.deepEqual(mapFrameworkToTopic('unregistered_framework_xyz'), []);
      assert.deepEqual(mapFrameworkToTopic(null), []);
      assert.deepEqual(mapFrameworkToTopic(undefined), []);
      assert.deepEqual(mapFrameworkToTopic(''), []);
    });
  });

  describe('getTopicSynonyms', () => {
    it('returns mapped topics for registered technologies', () => {
      const dockerTopics = getTopicSynonyms('Docker');
      assert.deepEqual(dockerTopics, ['docker', 'containers']);
    });

    it('generates a clean slug fallback for unregistered tools', () => {
      const fallback = getTopicSynonyms('my-custom-cli!');
      assert.deepEqual(fallback, ['my-custom-cli']);
    });

    it('handles empty or non-string inputs safely', () => {
      assert.deepEqual(getTopicSynonyms(null), []);
      assert.deepEqual(getTopicSynonyms(''), []);
    });
  });

  describe('isRecognizedTopic', () => {
    it('identifies recognized technologies', () => {
      assert.equal(isRecognizedTopic('react'), true);
      assert.equal(isRecognizedTopic('fastapi'), true);
      assert.equal(isRecognizedTopic('kubernetes'), true);
      assert.equal(isRecognizedTopic('some_random_string'), false);
      assert.equal(isRecognizedTopic(null), false);
    });
  });
});
