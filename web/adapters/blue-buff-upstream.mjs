export const BLUE_BUFF_UPSTREAM = Object.freeze({
  model: Object.freeze({
    id: 'songLucasXXX/tiny-voca-zh',
    revision: '9d6b4631bd59b1fa69b398913b852d03f22071d2',
    url: 'https://huggingface.co/songLucasXXX/tiny-voca-zh/tree/9d6b4631bd59b1fa69b398913b852d03f22071d2',
  }),
  source: Object.freeze({
    id: 'blue-buff/tiny-voca-zh',
    revision: '8b3fb5b460e828a90913edc28f3f1ddc51a66127',
    url: 'https://github.com/blue-buff/tiny-voca-zh/tree/8b3fb5b460e828a90913edc28f3f1ddc51a66127',
    noticeUrl: 'https://raw.githubusercontent.com/blue-buff/tiny-voca-zh/8b3fb5b460e828a90913edc28f3f1ddc51a66127/NOTICE.md',
  }),
});

export function blueBuffSupportSources() {
  return [BLUE_BUFF_UPSTREAM.model.url, BLUE_BUFF_UPSTREAM.source.url];
}
