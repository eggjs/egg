import React from 'react';
import Intro from './components/Intro';
import Links from './components/Links';
import Features from './components/Features';
import Copyright from './components/Copyright';

import { promo, features } from './conf';

const Home: React.FC<Props> = () => {
  const data = {
    desc: '为企业级框架和应用而生',
    guide: {
      desc: 'Get Started',
      link: '/intro/quickstart',
    },
    promo,
  };

  return (
    <>
      <Intro data={data} />
      <Features data={features} />
      <Links />
      <Copyright />
    </>
  );
};

export default Home;

interface Props {}
