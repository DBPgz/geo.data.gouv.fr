import {stringify} from 'querystring'
import React from 'react'
import PropTypes from 'prop-types'
import {flowRight} from 'lodash'
import getConfig from 'next/config'
import {withRouter} from 'next/router'

import {_get} from '../lib/fetch'
import {getFilters} from '../lib/query'
import {facetTypes} from '../lib/facets'

import attachI18n from '../components/hoc/attach-i18n'
import withErrors from '../components/hoc/with-errors'

import Page from '../components/page'
import Content from '../components/content'
import Container from '../components/container'
import Meta from '../components/meta'
import SearchInput from '../components/search-input'

import ActiveFacets from '../components/search/active-facets'
import Count from '../components/search/count'
import Results from '../components/search/results'
import Paging from '../components/search/paging'
import Facets from '../components/search/facets'
import FacetButton from '../components/search/facet-button'

const {publicRuntimeConfig: {
  GEODATA_API_URL
}} = getConfig()

class SearchPage extends React.Component {
  static propTypes = {
    result: PropTypes.shape({
      aggregations: PropTypes.object.isRequired,
      hits: PropTypes.shape({
        total: PropTypes.number.isRequired,
        hits: PropTypes.array.isRequired
      }).isRequired
    }),

    router: PropTypes.shape({
      query: PropTypes.object.isRequired,
      events: PropTypes.shape({
        on: PropTypes.func.isRequired,
        off: PropTypes.func.isRequired
      }).isRequired
    }).isRequired,

    t: PropTypes.func.isRequired,
    tReady: PropTypes.bool.isRequired
  }

  static defaultProps = {
    result: null
  }

  static async getInitialProps({query}) {
    let page = parseInt(query.p, 10) || 1
    if (page < 1) {
      page = 1
    }

    return {
      result: await _get(`${GEODATA_API_URL}/records?${stringify({
        q: query.q,
        limit: 20,
        offset: (page - 1) * 20,
        ...getFilters(query)
      })}`)
    }
  }

  state = {
    showFacets: false
  }

  componentDidMount() {
    const {router} = this.props
    router.events.on('routeChangeStart', this.onRouteChangeStart)
  }

  componentWillUnmount() {
    const {router} = this.props
    router.events.off('routeChangeStart', this.onRouteChangeStart)
  }

  onRouteChangeStart = () => {
    this.setState({
      showFacets: false
    })
  }

  mapGroupName = key => {
    switch (key) {
      case 'catalogs':
        return 'catalog'

      case 'organizations':
        return 'organization'

      case 'distributionFormats':
        return 'distributionFormat'

      case 'published':
        return 'dgvPublication'

      case 'downloadable':
        return 'availability'

      default:
        return key
    }
  }

  mapGroupValue = value => {
    switch (value.key_as_string) {
      case 'true':
        return 'yes'

      case 'false':
        return 'no'

      default:
        return value.key
    }
  }

  getFilterGroups = () => {
    const {result: {hits, aggregations}} = this.props

    if (hits.total === 1) {
      return []
    }

    return Object
      .entries(aggregations)
      .map(([name, values]) => ({
        name: this.mapGroupName(name),
        values: values.buckets
          .filter(v => v.doc_count !== hits.total)
          .map(v => ({
            value: this.mapGroupValue(v),
            count: v.doc_count
          }))
      }))
      .filter(group => group.values.length > 1)
  }

  getQueryFacets = () => {
    const {router: {query}} = this.props
    const facets = []

    for (const [name, value] of Object.entries(query)) {
      if (facetTypes.includes(name)) {
        if (Array.isArray(value)) {
          facets.push(...value.map(v => ({
            name,
            value: v
          })))
        } else {
          facets.push({
            name,
            value
          })
        }
      }
    }

    return facets
  }

  getPaging = (limit = 20) => {
    const {router: {query}} = this.props

    let page = 1
    if (query.p) {
      try {
        page = parseInt(query.p, 10)
        if (page < 1) {
          page = 1
        }
      } catch (error) {
        page = 1
      }
    }

    return {
      page,
      offset: (page - 1) * limit,
      limit
    }
  }

  toggleFacets = () => {
    this.setState(state => ({
      showFacets: !state.showFacets
    }))
  }

  closeFacets = () => {
    this.setState({
      showFacets: false
    })
  }

  render() {
    const {result: {hits}, router: {query}, t, tReady} = this.props

    const {showFacets} = this.state

    const groups = this.getFilterGroups()
    const queryFacets = this.getQueryFacets()
    const paging = this.getPaging()

    return (
      <Page ready={tReady}>
        {() => (
          <React.Fragment>
            <Meta title={t('title', {
              query: query.q,
              context: !query.q && 'empty'
            })} />
            <Content>
              <Container fluid>
                <div className='main'>
                  <div className='search'>
                    <div className='search-bar'>
                      <SearchInput hasButton />
                      {groups.length > 0 && <FacetButton onClick={this.toggleFacets} />}
                    </div>
                    <ActiveFacets facets={queryFacets} />
                    <Count count={hits.total} />
                    <Results results={hits.hits} />
                    {hits.total > 0 && <Paging count={hits.total} paging={paging} />}
                  </div>
                  <Facets groups={groups} open={showFacets} onClose={this.closeFacets} />
                </div>
              </Container>
            </Content>

            <style jsx global>{`
              body {
                @media (max-width: 960px) {
                  ${showFacets && 'overflow: hidden;'}
                }
              }
            `}</style>

            <style jsx>{`
              .main {
                display: flex;
                margin-bottom: 4em;
              }

              .search {
                flex: 1;
              }

              .search-bar {
                display: flex;
              }
            `}</style>
          </React.Fragment>
        )}
      </Page>
    )
  }
}

export default flowRight(
  attachI18n(['search', 'dataset']),
  withRouter,
  withErrors
)(SearchPage)
