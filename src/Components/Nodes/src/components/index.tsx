import React, { useCallback, useEffect } from 'react'
import Row from '@/Grid/src/components/row'
import store from '../stores'
import Grid from '@/Grid/src/components/grid'
import styled from 'styled-components'
import { OK } from '@/Restful/src/http-status'
import { gettext } from '@/Language/src'
import { SysLoadGroup } from '@/ServerStatus/src/components/system-load'
import ProgressBar from '@/ProgressBar/src/components'
import template from '@/Helper/src/components/template'
import {
  ServerStatusCpuUsageProps,
  ServerStatusUsageProps,
} from '@/ServerStatus/src/stores'
import { GUTTER } from '@/Config/src'
import Alert from '@/Helper/src/components/alert'
import Loading from '@/Helper/src/components/loading'
import serverFetch from '@/Fetch/src/server-fetch'
import NodeNetworks from './node-networks'
import { observer } from 'mobx-react-lite'

const StyledNodeGroupId = styled.a`
  display: block;
  text-decoration: underline;
  text-align: center;
  margin-bottom: calc(${GUTTER} / 2);
  :hover {
    text-decoration: none;
  }
`
const StyledNodeGroup = styled.div`
  margin-bottom: calc(${GUTTER} / 2);
`
const StyledNodeGroupMsg = styled(StyledNodeGroup)`
  display: flex;
  justify-content: center;
`

const SysLoad = ({ sysLoad }: { sysLoad: number[] }) => {
  if (!sysLoad?.length) {
    return null
  }

  return (
    <StyledNodeGroup>
      <SysLoadGroup isCenter sysLoad={sysLoad} />
    </StyledNodeGroup>
  )
}

const Cpu = ({ cpuUsage }: { cpuUsage: ServerStatusCpuUsageProps }) => {
  return (
    <StyledNodeGroup>
      <ProgressBar
        title={template(
          gettext(
            'idle: ${idle} \nnice: ${nice} \nsys: ${sys} \nuser: ${user}'
          ),
          cpuUsage
        )}
        value={100 - cpuUsage.idle}
        max={100}
        isCapacity={false}
        left={gettext('CPU usage')}
      />
    </StyledNodeGroup>
  )
}

const Memory = ({ memRealUsage }: { memRealUsage: ServerStatusUsageProps }) => {
  const { value = 0, max = 0 } = memRealUsage

  if (!max) {
    return null
  }

  const percent = Math.floor((value / max) * 10000) / 100

  return (
    <StyledNodeGroup>
      <ProgressBar
        title={template(gettext('Usage: ${percent}'), {
          percent: `${percent.toFixed(1)}%`,
        })}
        value={value}
        max={max}
        isCapacity
        left={gettext('Memory')}
      />
    </StyledNodeGroup>
  )
}

const Swap = ({ swapUsage }: { swapUsage: ServerStatusUsageProps }) => {
  const { value = 0, max = 0 } = swapUsage

  if (!max) {
    return null
  }

  const percent = Math.floor((value / max) * 10000) / 100

  return (
    <StyledNodeGroup>
      <ProgressBar
        title={template(gettext('Usage: ${percent}'), {
          percent: `${percent.toFixed(1)}%`,
        })}
        value={value}
        max={max}
        isCapacity
        left={gettext('Swap')}
      />
    </StyledNodeGroup>
  )
}

const Items = observer(() => {
  const items = store.items.map(
    ({ id, url, isLoading, isError, errMsg, data }) => {
      const idLink = <StyledNodeGroupId href={url}>{id}</StyledNodeGroupId>

      switch (true) {
        case isLoading:
          return (
            <Grid key={id} tablet={[1, 4]} mobileLg={[1, 2]}>
              {idLink}
              <StyledNodeGroupMsg>
                <Loading>{gettext('Fetching...')}</Loading>
              </StyledNodeGroupMsg>
            </Grid>
          )
        case isError:
          return (
            <Grid key={id} tablet={[1, 4]} mobileLg={[1, 2]}>
              {idLink}
              <StyledNodeGroupMsg>
                <Alert isSuccess={false} msg={errMsg} />
              </StyledNodeGroupMsg>
            </Grid>
          )
      }

      const { serverStatus, networkStats } = data

      return (
        <Grid
          key={id}
          tablet={[1, 2]}
          desktopSm={[1, 3]}
          desktopMd={[1, 4]}
          desktopLg={[1, 6]}>
          {idLink}
          <SysLoad sysLoad={serverStatus.sysLoad} />
          <Cpu cpuUsage={serverStatus?.cpuUsage} />
          <Memory memRealUsage={serverStatus?.memRealUsage} />
          <Swap swapUsage={serverStatus?.swapUsage} />
          <NodeNetworks
            items={networkStats?.networks || []}
            timestamp={networkStats?.timestamp || 0}
          />
        </Grid>
      )
    }
  )

  return <>{items}</>
})

const Nodes = observer(() => {
  const { items, itemsCount } = store

  const fetch = useCallback(async (nodeId: string) => {
    const { setItem } = store
    const { data: item, status } = await serverFetch(`node&nodeId=${nodeId}`)

    if (status === OK) {
      if (!item) {
        return
      }

      setItem({ id: nodeId, isLoading: false, data: item })
      // fetch again
      setTimeout(() => {
        fetch(nodeId)
      }, 1000)
    } else {
      setItem({
        id: nodeId,
        isLoading: false,
        isError: true,
        errMsg: template(gettext('Fetch failed. Node returns ${code}.'), {
          code: status,
        }),
      })
    }
    // setItem({
    //   id: nodeId,
    //   isLoading: false,
    //   isError: true,
    //   errMsg: gettext('Fetch failed. Detail in Console.'),
    // })
    // console.warn(
    //   template(gettext('Node [${nodeId}] fetch failed.'), { nodeId }),
    //   e
    // )
  }, [])

  useEffect(() => {
    if (itemsCount) {
      for (const { id } of items) {
        fetch(id)
      }
    }
  }, [])

  return (
    <Row>
      <Items />
    </Row>
  )
})

export default Nodes
