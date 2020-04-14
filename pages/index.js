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
  '/dublin-city/residential-property-for-rent/?mnp=1500&mxp=2300&mnb=1&mxb=2&s%5Bmnp%5D=1600&s%5Bmxp%5D=2300&s%5Bmnb%5D=1&s%5Bmxb%5D=2&s%5Badvanced%5D=1&s%5Bignored_agents%5D%5B0%5D=1551&s%5Bsort_by%5D=price&s%5Bsort_type%5D=d&searchSource=rental'

const asNextButton = ($) => $('.next_page').length
const getNextPageUrl = ($) => `${$('.next_page a').attr('href')}`
const getPrevPageUrl = ($) => `${$('.prev_page a').attr('href')}`
const asPrevButton = ($) => $('.prev_page').length

const exportRentals = (rentals) => {
  navigator.clipboard.writeText(JSON.stringify(rentals)).then(
    function () {
      console.log('Copying to clipboard was successful!')
    },
    function (err) {
      console.error('Async: Could not copy text: ', err)
    }
  )
}

const getImgs = async (url) => {
  const res = await fetch(
    'https://cors-anywhere.herokuapp.com/https://www.daft.ie/dublin/apartments-for-rent/ballsbridge/mespil-estate-sussex-road-ballsbridge-dublin-2019208/'
  )
  const html = await res.text()
  const $ = cheerio.load(html)

  const imgs = []
  $('li.pbxl_carousel_item img').map((index, img) => {
    imgs.push(img.src)
  })
  return imgs
}

const parseRentalHtml = ($, element) => {
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

const filterNewRental = (rentals, list) => {
  const indexList = rentals.map(({ id }) => id)
  return list.filter((rental) => indexList.indexOf(rental.id) === -1)
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

const getUnseenRentals = (rentals, seenRentals) => {
  const seenRentalIds = seenRentals.map((seenRental) => seenRental.id)
  return rentals.filter((rental) => seenRentalIds.indexOf(rental.id) === -1)
}

const getUniqRentals = (rentals = []) => [
  ...new Map(rentals.map((item) => [item['id'], item])).values(),
]

const UNSEEN = 'UNSEEN'
const SEEN = 'SEEN'
const FAV = 'FAV'

const Home = () => {
  const [interval, setInterval] = useState(10000)
  const [page, setPage] = useState(UNSEEN)
  const [rentals, setRentals] = useState([])
  const [seenRentals, setSeenRentals] = useState([])
  const [favRentals, setFavRentals] = useState([])

  useEffect(() => {
    setRentals(
      getUniqRentals(JSON.parse(localStorage.getItem('_rentals')) || [])
    )
    setSeenRentals(
      getUniqRentals(JSON.parse(localStorage.getItem('_seenRentals')) || [])
    )
    setFavRentals(
      getUniqRentals(JSON.parse(localStorage.getItem('_favRentals')) || [])
    )
  }, [])

  useEffect(() => {
    localStorage.setItem('_rentals', JSON.stringify(getUniqRentals(rentals)))
    localStorage.setItem(
      '_seenRentals',
      JSON.stringify(getUniqRentals(seenRentals))
    )
    localStorage.setItem(
      '_favRentals',
      JSON.stringify(getUniqRentals(favRentals))
    )
  }, [rentals, seenRentals, favRentals])

  useInterval(async () => {
    try {
      let list = await getRentals()
      const listNewRentals = filterNewRental(rentals, list)
      if (listNewRentals.length) {
        setRentals(getUniqRentals([...rentals, ...listNewRentals]))
      }
    } catch (e) {
      console.error(e)
      setInterval(null)
    }
  }, interval)

  return (
    <div className="container">
      <Head>
        <title>Daft.io</title>
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/1.2.0/tailwind.css"
          rel="stylesheet"
        ></link>

        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/1.2.0/utilities.css"
          rel="stylesheet"
        ></link>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/1.2.0/components.css"
          rel="stylesheet"
        ></link>
      </Head>

      <button
        className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => setPage(UNSEEN)}
      >
        New Rentals
      </button>

      <button
        className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => setPage(SEEN)}
      >
        Seen Rentals
      </button>

      <button
        className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => setPage(FAV)}
      >
        ❤️ Rentals
      </button>
      {page === UNSEEN && (
        <>
          <button
            className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setSeenRentals(rentals)}
          >
            Hide everything
          </button>
          <button
            className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => exportRentals(seenRentals)}
          >
            export seen rentals
          </button>
          <button
            className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => exportRentals(rentals)}
          >
            export all rentals
          </button>
        </>
      )}
      <div className="w-full flex flex-wrap">
        {(page === UNSEEN
          ? getUnseenRentals(rentals, seenRentals)
          : page === SEEN
          ? seenRentals
          : favRentals
        ).map((rental) => {
          const { id, price, address, gmapsUrl, imgUrl, url } = rental
          return (
            <div
              key={`${url}-${id}`}
              className="rounded overflow-hidden shadow-lg  w-1/4 m-4"
            >
              <img className="w-full" src={imgUrl} />
              <div className="px-6 py-4">
                <div className="font-bold text-xl mb-2">{price}</div>
                <p className="text-gray-700 text-base">{address}</p>
              </div>
              <div className="px-6 py-4">
                <span
                  onClick={() =>
                    setSeenRentals(getUniqRentals([...seenRentals, rental]))
                  }
                  className="inline-block bg-red-400 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 cursor-pointer"
                >
                  Hide
                </span>
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
                  <a target="_blank" href={url}>
                    daft
                  </a>
                </span>
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
                  <a target="_blank" href={gmapsUrl}>
                    google
                  </a>
                </span>
                <span
                  onClick={() =>
                    favRentals.find((favRental) => rental.id === favRental.id)
                      ? setFavRentals(
                          favRentals.filter(
                            (favRental) => favRental.id !== rental.id
                          )
                        )
                      : setFavRentals(getUniqRentals([...favRentals, rental]))
                  }
                  className="inline-block bg-purple-400 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 cursor-pointer"
                >
                  {favRentals.find((favRental) => favRental.id === rental.id)
                    ? 'UnSave'
                    : 'Save'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Home
