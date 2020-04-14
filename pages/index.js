import Head from 'next/head'
import { useState, useEffect } from 'react'
import useInterval from '../hooks/useInterval'
import cheerio from 'cheerio'

const PREV = 1
const NEXT = 2
let direction = NEXT

const baseUrl = 'https://cors-anywhere.herokuapp.com'
const daftHostUrl = 'https://www.daft.ie'
let url =
  '/dublin-city/residential-property-for-rent/?mnp=1600&mxp=2300&mnb=1&mxb=2&s%5Bmnp%5D=1600&s%5Bmxp%5D=2300&s%5Bmnb%5D=1&s%5Bmxb%5D=2&s%5Badvanced%5D=1&s%5Bignored_agents%5D%5B0%5D=1551&s%5Bsort_by%5D=price&s%5Bsort_type%5D=d&searchSource=rental'

const asNextButton = ($) => $('.next_page').length
const getNextPageUrl = ($) => `${$('.next_page a').attr('href')}`
const getPrevPageUrl = ($) => `${$('.prev_page a').attr('href')}`
const asPrevButton = ($) => $('.prev_page').length

const exportRentals = (rentals) => {
  navigator.clipboard.writeText(JSON.stringify(rentals)).then(
    function () {
      console.log('Async: Copying to clipboard was successful!')
    },
    function (err) {
      console.error('Async: Could not copy text: ', err)
    }
  )
}

const getImgs = async (url) => {
  console.log('getImgs', url)
  const res = await fetch(
    'https://cors-anywhere.herokuapp.com/https://www.daft.ie/dublin/apartments-for-rent/ballsbridge/mespil-estate-sussex-road-ballsbridge-dublin-2019208/'
  )
  const html = await res.text()
  const $ = cheerio.load(html)

  const imgs = []
  $('li.pbxl_carousel_item img').map((index, img) => {
    console.log(img.src)
    imgs.push(img.src)
  })
  return imgs
}

const parseRentalHtml = ($, element) => {
  console.log('parseRentalHtml')

  const url = `${daftHostUrl}${$(
    '.PropertyInformationCommonStyles__propertyPrice--link',
    element
  ).attr('href')}`
  const id = url.substr(-8, 7)
  const price = $(
    '.PropertyInformationCommonStyles__costAmountCopy',
    element
  ).text()
  const address = $(
    '.PropertyInformationCommonStyles__addressCopy',
    element
  ).text()
  const imgUrl = (/window\.portraitize\(\"(.*)\"/.exec(
    $(element).next().html()
  ) || ['', ''])[1]
  const gmapsUrl = `https://www.google.com/maps/place/${encodeURIComponent(
    address
  )}`
  const beds = (
    $(
      'img[src="https://c1.dmstatic.com/944/images/search/bed.svg"]',
      element
    ).attr('alt') || ''
  ).slice(-1)

  return {
    id,
    url,
    price,
    address,
    imgUrl,
    beds,
    gmapsUrl,
  }
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const filterNewRental = (oldRentals, list) => {
  let oldRentalIndexList = oldRentals.map(({ id }) => id)
  return list.filter((rental) => oldRentalIndexList.indexOf(rental.id) === -1)
}

const getRentals = async () => {
  const fetchUrl = `${baseUrl}/${daftHostUrl}${url}`
  const res = await fetch(fetchUrl)
  const html = await res.text()
  const $ = cheerio.load(html)

  if (direction === NEXT) {
    if (asNextButton($)) {
      url = getNextPageUrl($)
    } else {
      direction = PREV
      url = getPrevPageUrl($)
    }
  } else {
    if (direction === PREV) {
      if (asPrevButton($)) {
        url = getPrevPageUrl($)
      } else {
        direction = NEXT
        url = getNextPageUrl($)
      }
    }
  }

  const rentals = []
  $('#sr_content .PropertyCardContainer__container ').map((index, element) => {
    const rental = parseRentalHtml($, element)
    if (rental.url) {
      rentals.push(rental)
    }
  })
  return rentals
}

const Home = () => {
  const [newRentals, setNewRentals] = useState([])
  const [oldRentals, setOldRentals] = useState([])

  useEffect(() => {
    localStorage.setItem('_newRentals', JSON.stringify(newRentals))
    localStorage.setItem('_oldRentals', JSON.stringify(oldRentals))
  }, [newRentals, oldRentals])

  useEffect(() => {
    const newRentals = JSON.parse(localStorage.getItem('_newRentals'))
    const oldRentals = JSON.parse(localStorage.getItem('_oldRentals'))
    if (newRentals) {
      setNewRentals(newRentals)
    }
    if (oldRentals) {
      setOldRentals(oldRentals)
    }
  }, [])

  useInterval(async () => {
    let list = await getRentals()
    setNewRentals(filterNewRental(oldRentals, list))
  }, 10000)

  return (
    <div className="container">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="title">Welcome to Daft.io</h1>
        <button onClick={() => exportRentals(oldRentals)}>
          export old rentals
        </button>
        <button onClick={() => exportRentals(oldRentals)}>
          export new rentals
        </button>

        <div className="grid">
          {newRentals.map((rental) => {
            const { id, price, address, gmapsUrl, imgUrl, beds, url } = rental
            return (
              <div key={id} className="card">
                <h3>{price}</h3>
                <button onClick={() => setOldRentals([...oldRentals, rental])}>
                  nope
                </button>
                <p>{address}</p>
                <img src={imgUrl} />
                <p>{beds} beds</p>
                <a href={url}>go to daft</a>
                <a href={gmapsUrl}>google</a>
              </div>
            )
          })}
        </div>
      </main>

      <footer>
        <a
          href="https://zeit.co?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by <img src="/zeit.svg" alt="ZEIT Logo" />
        </a>
      </footer>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        footer {
          width: 100%;
          height: 100px;
          border-top: 1px solid #eaeaea;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        footer img {
          margin-left: 0.5rem;
        }

        footer a {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .title a {
          color: #0070f3;
          text-decoration: none;
        }

        .title a:hover,
        .title a:focus,
        .title a:active {
          text-decoration: underline;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
        }

        .title,
        .description {
          text-align: center;
        }

        .description {
          line-height: 1.5;
          font-size: 1.5rem;
        }

        code {
          background: #fafafa;
          border-radius: 5px;
          padding: 0.75rem;
          font-size: 1.1rem;
          font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
            DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
        }

        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;

          max-width: 800px;
          margin-top: 3rem;
        }

        .card {
          margin: 1rem;
          flex-basis: 45%;
          padding: 1.5rem;
          text-align: left;
          color: inherit;
          text-decoration: none;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .card:hover,
        .card:focus,
        .card:active {
          color: #0070f3;
          border-color: #0070f3;
        }

        .card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }

        .card p {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.5;
        }

        @media (max-width: 600px) {
          .grid {
            width: 100%;
            flex-direction: column;
          }
        }
      `}</style>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}

export default Home
