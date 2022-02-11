import React from 'react';
import { List } from 'antd';
import { friendList } from '../../conf';

import styles from './index.less';

const Footer: React.FC<Props> = (props) => {
  return (
    <div className={styles.links}>
      <div className={styles.link_wrap}>
        {friendList.map((col, index) => {
          const { title, list } = col;

          if (!list) {
            return null;
          }

          return (
            <div className={styles.link_item} key={`${index}`}>
              <List
                key={title}
                header={title}
                dataSource={list}
                bordered={false}
                split={false}
                renderItem={(item: {
                  name: string;
                  qrcode?: string;
                  url?: string;
                }) => {
                  if (item.qrcode) {
                    return (
                      <List.Item>
                        <img className={styles.qrcode} src={item.qrcode} />
                      </List.Item>
                    );
                  }

                  return (
                    <List.Item>
                      <a href={item.url} target="_blank">
                        {item.name}
                      </a>
                    </List.Item>
                  );
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Footer;

interface Props {}
