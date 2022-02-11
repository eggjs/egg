import React from 'react';
import styles from './index.less';

const Copyright: React.FC<Props> = (props) => {
  return (
    <div className={styles.copyright}>
      Copyright © {new Date().getFullYear()} Egg.js
    </div>
  );
};

export default Copyright;

interface Props {}
