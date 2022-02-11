import React, { useContext } from 'react';
import { context } from 'dumi/theme';
import Layout from 'dumi-theme-default/es/layout';

const style = {
  wrap: {
    borderBottom: '1px solid #eee',
    marginBottom: '1em',
  },
  title: {
    color: '#454d64',
  },
};

export default ({ children, ...props }) => {
  const { meta } = useContext(context);
  const { title, hero } = meta;
  
  const renderTitle = () => {
    if (hero) {
      return null;
    }

    return (
      <div style={style.wrap}>
        <h1 style={style.title}>{title}</h1>
      </div>
    );
  };
  
  return (
    <Layout {...props}>
      {renderTitle()}

      {children}
    </Layout>
  );
};
