import React from 'react';
import styles from './index.less';

const Intro: React.FC<Props> = (props) => {
  const {
    data: { desc, guide, promo },
  } = props;

  return (
    <div className={styles.banner}>
      <div className={styles.banner_wrap}>
        <div className={styles.logo}>
          <a href={guide.link}>
            <img src="https://zos.alipayobjects.com/rmsportal/JFKAMfmPehWfhBPdCjrw.svg" />
          </a>
        </div>

        <div className={styles.info}>
          <h1>
            <p className={styles.stronge}>Born to build</p>better enterprise
            frameworks and apps with Node.js &amp; Koa
          </h1>
          <p>{desc}</p>

          <div className={styles.buttons}>
            <a
              className={`${styles.button} ${styles.primary}`}
              href={guide.link}
            >
              {guide.desc}
            </a>
            <a
              className={`${styles.button} ${styles.secondary}`}
              href="https://github.com/eggjs/egg/"
            >
              GitHub
            </a>
          </div>

          <div className={styles.promote}>
            {promo.logo ? <img src={promo.logo} /> : null}
            <a href={promo.link} target="_blank">
              {promo.title} &gt;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;

interface Props {
  data: {
    desc: string;
    guide: {
      desc: string;
      link: string;
    };
    promo: {
      logo?: string;
      title: string;
      link: string;
    };
  };
}
