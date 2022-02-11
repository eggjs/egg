import React, { useContext } from 'react';
import { context } from 'dumi/theme';
import Layout from 'dumi-theme-default/es/layout';

const style = {
  wrap: {
    marginBottom: '1em',
    boxShadow: '0px 1px 0px rgba(0,0,0,0.1)',
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
