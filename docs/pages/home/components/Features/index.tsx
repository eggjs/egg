import React from 'react';
import styles from './index.less';

const Feature: React.FC<Props> = (props) => {
  const { data } = props;
  return (
    <div className={styles.features}>
      <div className={styles.features_wrap}>
        {data.map((item, index) => {
          return (
            <div className={styles.feature_item} key={`${index}`}>
              <div className={styles.feature_item_icon}>
                <img src={item.icon} />
              </div>
              <h2>{item.title}</h2>
              <p>{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Feature;

interface Props {
  data: Array<{
    title: string;
    desc: string;
    icon: string;
  }>;
}
