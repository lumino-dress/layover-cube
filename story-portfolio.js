// OUR STORY 전용: 공개된 본문만 표시하며 관리자 저장 기능은 호출하지 않습니다.
export function prepareStoryPortfolio(body, document, catalog) {
  const template = document.createElement('div');
  template.innerHTML = catalog.sanitizeRichText(body);
  // HTML 속성이나 이미지를 건드리지 않고 일반 텍스트의 마크다운 이미지만 변환합니다.
  function visit(parent) {
    for (const node of [...parent.childNodes]) {
      if (node.nodeType === 1) {
        if (!['PRE', 'CODE', 'A'].includes(node.tagName)) visit(node);
        continue;
      }
      if (node.nodeType !== 3 || !node.textContent.includes('![')) continue;
      const pattern = /!\[([^\]\n]*)\]\(\s*(<[^>\n]+>|[^\s]+?)(?:\s+"[^"\n]*")?\s*\)/g;
      const fragment = document.createDocumentFragment();
      let offset = 0;
      for (const match of node.textContent.matchAll(pattern)) {
        fragment.append(document.createTextNode(node.textContent.slice(offset, match.index)));
        const raw = match[2].replace(/^<|>$/g, '');
        const source = catalog.safeImageUrl(raw);
        if (source) {
          const image = document.createElement('img');
          image.setAttribute('src', source);
          image.setAttribute('alt', match[1]);
          fragment.append(image);
        } else {
          fragment.append(document.createTextNode(match[1] || '표시할 수 없는 이미지'));
        }
        offset = match.index + match[0].length;
      }
      if (offset) {
        fragment.append(document.createTextNode(node.textContent.slice(offset)));
        node.replaceWith(fragment);
      }
    }
  }
  visit(template);
  // 편집기가 이미지 사이에 남긴 빈 문단과 이미지 문단의 줄바꿈만 정리합니다.
  for (const paragraph of [...template.querySelectorAll('p')]) {
    if (!paragraph.textContent.replace(/\u00a0/g, ' ').trim() && !paragraph.querySelector('img,video,iframe,input,table,hr')) {
      paragraph.remove();
    } else if (!paragraph.textContent.trim() && paragraph.querySelector('img') && !paragraph.querySelector('video,iframe')) {
      paragraph.classList.add('story-portfolio-image-row');
      paragraph.querySelectorAll('br').forEach(br => br.remove());
    }
  }
  // 변환 후에도 기존 안전 처리를 적용합니다.
  const result = document.createElement('div');
  result.innerHTML = catalog.sanitizeRichText(template.innerHTML);
  // 안전 처리가 class를 제거하므로 검증 후 표시용 클래스만 부여합니다.
  for (const paragraph of result.querySelectorAll('p')) {
    if (!paragraph.textContent.trim() && paragraph.querySelector('img') && !paragraph.querySelector('video,iframe')) paragraph.classList.add('story-portfolio-image-row');
  }
  return result.innerHTML.trim();
}

export async function loadStoryPortfolio(root, { fetcher = fetch, document = globalThis.document, catalog = globalThis.ProductCatalog } = {}) {
  root.setAttribute('aria-busy', 'true');
  try {
    const response = await fetcher('portfolio.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('portfolio unavailable');
    const data = await response.json();
    if (typeof data?.body !== 'string' || !catalog) throw new Error('invalid portfolio');
    const html = prepareStoryPortfolio(data.body, document, catalog);
    if (!html) {
      root.innerHTML = '<p class="portfolio-status">등록된 포트폴리오 내용이 없습니다.</p>';
    } else {
      root.innerHTML = html;
      root.querySelectorAll('img').forEach(image => image.addEventListener('error', () => {
        const message = document.createElement('span');
        message.className = 'portfolio-status';
        message.textContent = '이미지를 불러오지 못했습니다.';
        image.replaceWith(message);
      }, { once: true }));
    }
  } catch (_) {
    root.innerHTML = '<p class="portfolio-status">포트폴리오를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'quiet-link';
    retry.textContent = '다시 불러오기 ↻';
    retry.addEventListener('click', () => loadStoryPortfolio(root, { fetcher, document, catalog }));
    root.append(retry);
  } finally { root.setAttribute('aria-busy', 'false'); }
}

const root = globalThis.document?.getElementById('story-portfolio-content');
if (root) loadStoryPortfolio(root);
