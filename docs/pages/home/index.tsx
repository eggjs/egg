import React from 'react';
import Banner from './banner';
import { promo } from './config';

const Home: React.FC<Props> = () => {
  const data = {
    desc: '为企业级框架和应用而生',
    guide: {
      desc: 'Get Started',
      link: '/intro/quickstart',
    },
    promo,
  };

  return <Banner data={data} />;
};

export default Home;

interface Props {}
