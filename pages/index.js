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

const filterNewRental = (oldRentals, newRentals, list) => {
  let oldRentalIndexList = oldRentals.map(({ id }) => id)
  let newRentalIndexList = newRentals.map(({ id }) => id)
  const notNewRentalIndexList = [...oldRentalIndexList, ...newRentalIndexList]
  return list.filter(
    (rental) => notNewRentalIndexList.indexOf(rental.id) === -1
  )
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
    setNewRentals(JSON.parse(localStorage.getItem('_newRentals')) || [])
    setOldRentals(JSON.parse(localStorage.getItem('_oldRentals')) || [])
  }, [])

  useEffect(() => {
    localStorage.setItem('_newRentals', JSON.stringify(newRentals))
    localStorage.setItem('_oldRentals', JSON.stringify(oldRentals))
  }, [newRentals, oldRentals])

  useInterval(async () => {
    let list = await getRentals()
    const listNewRentals = filterNewRental(oldRentals, newRentals, list)
    if (listNewRentals.length) {
      setNewRentals(listNewRentals)
    }
  }, 10000)

  return (
    <div className="container">
      <Head>
        <title>Create Next App</title>
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
        onClick={() => setOldRentals([...oldRentals, ...newRentals])}
      >
        Set everything to old
      </button>
      <button
        className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => exportRentals(oldRentals)}
      >
        export old rentals
      </button>
      <button
        className="m-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => exportRentals(newRentals)}
      >
        export new rentals
      </button>
      <div className="w-full flex flex-wrap">
        {newRentals.map((rental) => {
          const { id, price, address, gmapsUrl, imgUrl, beds, url } = rental
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
                  onClick={() => {
                    setOldRentals([...oldRentals, rental])
                    setNewRentals([
                      ...newRentals.filter(
                        (_rental) => _rental.id !== rental.id
                      ),
                    ])
                  }}
                  className="inline-block bg-red-400 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 cursor-pointer"
                >
                  Hide
                </span>
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
                  <a href={url}>daft</a>
                </span>
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
                  <a href={gmapsUrl}>google</a>
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
