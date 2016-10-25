import React from 'react'

const DownloadsSection = ({links}) => {
  const styles = {
    downloads: {
      display: 'flex',
      flexDirection: 'column',
    },
    links: {
      display: 'flex',
      flexDirection: 'column',
    }
  }
  return (
    <div style={styles.links}>
      <h3>Downloads</h3>
      <div style={styles.links}>
        {links.map( (link, idx) => <a key={idx} href={link.href}>{link.name}</a>)}
      </div>
    </div>
      )
}

export default DownloadsSection