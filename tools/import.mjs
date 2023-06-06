import { Client } from '@notionhq/client'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import './env.mjs'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

const databaseId = process.env.NOTION_DATABASE_ID
const assetsDir = `./public/posts`

const getDatabase = async () => {
  const response = await notion.databases.retrieve({ database_id: databaseId })
  return response
}

const getPage = async pageId => {
  const response = await notion.pages.retrieve({
    page_id: pageId
  })
  return response
}

const getBlock = async pageId => {
  const response = await notion.blocks.children.list({
    block_id: pageId,
    properties: true
  })
  return response
}

const getPagesInDatabase = async () => {
  console.log('Fetching database entries...')
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        { property: 'public', checkbox: { equals: true } },
        { property: 'Type', select: { equals: 'Blog Post' } }
      ]
    }
  })
  return response.results
}

const exportPage = async page => {
  const pageData = await getPage(page.id)

  // If the page is public, continue with exporting
  const pageBlock = await getBlock(page.id)

  const categoryNames = pageData.properties.categories.multi_select.map(
    category => category.name
  )

  const frontmatter = {
    title: pageData.properties.Name.title[0].text.content,
    description: pageData.properties.description.rich_text[0].text.content,
    pubDate: new Date(pageData.properties.Publication_Date.date.start),
    updatedDate: pageData.last_edited_time,
    heroImage: '',
    public: pageData.properties.public.checkbox.toString(),
    slug: pageData.properties.slug
      ? pageData.properties.slug.rich_text[0].text.content
      : pageData.properties.Name.title[0].text.content,
    categories: categoryNames
  }

  // Add Page content to the body
  let body = pageBlock.results
    .map(block => {
      switch (block.type) {
        case 'paragraph':
          return `${block.paragraph.rich_text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'heading_1':
          return `# ${block.heading_1.rich_text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'heading_2':
          return `## ${block.heading_2.rich_text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'heading_3':
          return `### ${block.heading_3.rich_text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'bulleted_list_item':
          return `- ${block.bulleted_list_item.rich_text
            .map(text => text.text.content)
            .join('')}\n\n`
        case 'numbered_list_item':
          return `1. ${block.numbered_list_item.rich_text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'to_do':
          return `- [${block.to_do.checked ? 'x' : ' '}] ${block.to_do.text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'toggle':
          return `> ${block.toggle.text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'quote':
          return `> ${block.quote.rich_text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'callout':
          return `> **${block.callout.icon.type}**: ${block.callout.text
            .map(text => text.plain_text)
            .join('')}\n\n`
        case 'code':
          return `\`\`\`${block.code.language.toLowerCase()}\n${
            block.code.code
          }\n\`\`\`\n\n`
        case 'embed':
          return `[![${block.embed.caption[0].plain_text}](${block.embed.url})](${block.embed.embed_url})\n\n`
        case 'image':
          const url = block.image.file
            ? block.image.file.url
            : block.image.external.url
          const filename = `${block.image.caption[0]?.plain_text.replaceAll(
            ' ',
            '-'
          )}.jpg`
          const filePath = `${assetsDir}/${filename}`
          const altText = block.image.caption[0]?.plain_text

          if (!fs.existsSync(path.join(assetsDir))) {
            fs.mkdirSync(path.join(assetsDir), {
              recursive: true
            })
          }

          if (altText && altText.toLowerCase().includes('thumbnail')) {
            console.log(filePath)
            frontmatter.heroImage = filePath
              .replace('.', '')
              .replaceAll(' ', '-')
              .replaceAll('/public', '')
          }

          if (fs.existsSync(filePath)) {
            console.log(`Image ${filename} already exists in ${assetsDir}`)
            return ''
          }

          const writer = fs.createWriteStream(filePath)

          axios
            .get(url, { responseType: 'stream' })
            .then(response => {
              response.data.pipe(writer)
              // console.log(`Downloaded image ${url} to ${filePath}`)
            })
            .catch(error => {
              console.error(`Failed to download image ${url}: ${error.message}`)
            })

          return !altText.toLowerCase().includes('thumbnail')
            ? `![${block.image.caption[0]?.plain_text}](<${filePath
                .replace('.', '')
                .replaceAll(' ', '-')}>)\n\n`
            : ''

        case 'video':
          return `[![${block.video.caption[0].plain_text}](${block.video.thumbnail_url})](${block.video.embed_url})\n\n`
        case 'pdf':
          return `[${block.pdf.name}](${block.pdf.url})\n\n`
        case 'audio':
          return `![${block.audio.title}](${block.audio.external_url})\n\n`
        default:
          return ''
      }
    })
    .join('')

  // Generate the file path and name
  const filename = `${pageData.properties.Name.title[0].plain_text}.md`
  const filePath = `./src/content/blog/${filename}`

  // Check if file exists
  if (fs.existsSync(filePath)) {
    console.log(`File ${filePath} already exists. Skipping write operation.`)
  } else {
    // Write the file
    fs.writeFileSync(
      filePath,
      `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${body}`
    )

    console.log(
      `Exported page "${pageData.properties.Name.title[0].plain_text}" to ${filePath}`
    )
  }
}

const importDataBase = async () => {
  const database = await getDatabase()
  console.log(
    `Exporting pages from database "${database.title[0].text.content}"...`
  )

  const pages = await getPagesInDatabase()

  const blogDir = path.join('src', 'content', 'blog')
  const files = fs.readdirSync(blogDir)

  // Iterate through all files in blogDir
  for (const file of files) {
    const filePath = path.join(blogDir, file)

    // Check if the file is a markdown file
    if (path.extname(file) === '.md') {
      // Check if the file's name is not in the pages array
      const fileSlug = path.basename(file, '.md')
      const page = pages.find(
        p => p.properties.Name.title[0].text.content === fileSlug
      )

      if (!page) {
        console.log(`Deleting file ${file}...`)
        fs.unlinkSync(filePath)
      }
    }
  }

  // Export pages that meet the criteria
  for (const page of pages) {
    await exportPage(page)
  }

  console.log('Done!')
}

importDataBase()
export default importDataBase
