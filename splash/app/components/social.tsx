import { Tweet } from 'react-tweet';

const tweets = [
  '1853560800050651632',
  '1853447982781239383',
  '1853242495540363750',
  '1853191842377941445',
  '1853201667480527032',
  '1853535228746489966',
  '1873819850638016610',
  '1872679875796160528',
  '1866549472861491341',
  '1879219290001621387',
  '1874963073548845348',
  '1879220737669558711',
];

export const Social = () => (
  <section className="grid sm:grid-cols-3 sm:divide-x" id="community">
    <div className="hidden bg-dashed sm:block">
      <div className="sticky top-14 p-8">
        <h2 className="font-bold text-4xl tracking-tight">
          Loved by the community
        </h2>
      </div>
    </div>
    <div className="columns-1 gap-4 p-8 sm:col-span-2 md:columns-2">
      {tweets.map((tweet, index) => (
        <div key={tweet} className={index ? '' : 'sm:-mt-6'}>
          <Tweet id={tweet} />
        </div>
      ))}
    </div>
  </section>
);
