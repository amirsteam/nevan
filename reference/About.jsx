import React from 'react';
import { Container, Row, Col, Card, Button, Image } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const AboutScreen = () => {
  return (
    <>
      {/* HERO SECTION */}
      <div className='bg-primary text-white py-5 mb-5'>
        <Container className='text-center'>
          <h1 className='display-4 fw-bold'>About Nevan Handicraft</h1>
          <p className='lead'>A mother’s love, stitched into every creation.</p>
        </Container>
      </div>

      <Container>
        {/* STORY SECTION */}
        <Row className='align-items-center mb-5'>
          <Col md={6}>
            <Image
              src='/images/anjana.jpg'
              alt='Nevan handicraft'
              fluid
              rounded
              className='shadow'
            />
          </Col>

          <Col md={6} className='mt-4 mt-md-0'>
            <h2 className='text-primary fw-bold'>Our Story</h2>

            <p>
              Nevan Handicraft began with a heartfelt intention — to create
              meaningful, honest, and handmade pieces that bring warmth into
              everyday life.
            </p>

            <p>
              During the Covid era, our first brand <b>Nevan Collection</b> was
              born, crafting reusable and eco-friendly handmade masks. When life
              moved forward and motherhood unfolded, a new inspiration bloomed:
              <b> Nevan Sprouts</b>, a baby clothing brand rooted in softness,
              comfort, and a mother’s touch.
            </p>

            <p>
              Today, both brands grow together under <b>Nevan Handicraft</b> — a
              home where creativity, care, and heartfelt crafting become
              beautiful memories.
            </p>

            <Link to='/'>
              <Button variant='outline-primary' size='lg' className='mt-3'>
                Back to Home
              </Button>
            </Link>
          </Col>
        </Row>

        {/* VALUES SECTION */}
        <h2 className='text-center fw-bold mb-4'>What Inspires Us</h2>

        <Row className='mb-5'>
          <Col md={4} className='mb-4'>
            <Card className='h-100 shadow-sm border-0 text-center'>
              <Card.Body>
                <div className='display-4 mb-3'>💛</div>
                <Card.Title>Handmade With Love</Card.Title>
                <Card.Text>
                  Every piece is crafted with warmth, patience, and intention —
                  the kind of care only a mother can give.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} className='mb-4'>
            <Card className='h-100 shadow-sm border-0 text-center'>
              <Card.Body>
                <div className='display-4 mb-3'>🌿</div>
                <Card.Title>Eco-Friendly Mindset</Card.Title>
                <Card.Text>
                  Slow, ethical, and sustainable crafting using soft, safe,
                  eco-friendly materials for every child.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} className='mb-4'>
            <Card className='h-100 shadow-sm border-0 text-center'>
              <Card.Body>
                <div className='display-4 mb-3'>🤱</div>
                <Card.Title>For Moms, By Moms</Card.Title>
                <Card.Text>
                  We understand comfort, quality and the small details — because
                  we are moms too.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* MISSION / VISION / PROMISES */}
        <Row className='mb-5'>
          {/* Mission */}
          <Col md={4} className='mb-4'>
            <h3 className='text-primary fw-bold'>Mission</h3>
            <ul>
              <li>To create honest, comfortable handmade products.</li>
              <li>To bring joy, safety and warmth to every family.</li>
              <li>One stitch, one accessory, and one outfit at a time.</li>
            </ul>
          </Col>

          {/* Vision */}
          <Col md={4} className='mb-4'>
            <h3 className='text-primary fw-bold'>Vision</h3>
            <p>
              To grow Nevan Handicraft into a trusted handmade brand where
              mothers find comfort, creativity and quality. A place where small,
              meaningful creations make a big difference in everyday life.
            </p>
          </Col>

          {/* Promise */}
          <Col md={4} className='mb-4'>
            <h3 className='text-primary fw-bold'>Our Promise</h3>
            <ul>
              <li>Handmade with care.</li>
              <li>Soft, safe & baby-friendly fabrics.</li>
              <li>Eco-friendly and ethical mindset.</li>
              <li>Slow, thoughtful crafting.</li>
              <li>Gratitude in every order.</li>
            </ul>
          </Col>
        </Row>

        {/* WHY MOMS TRUST US */}
        <div className='bg-light p-5 rounded-3 text-center mb-5 shadow-sm'>
          <h2 className='fw-bold mb-3'>Why Moms Trust Us</h2>
          <p className='mx-auto' style={{ maxWidth: '700px' }}>
            Because we are moms too. We understand comfort, softness, quality,
            and the little things that truly matter. Every product carries a
            piece of our heart and hard work.
          </p>
        </div>

        {/* THANK YOU SECTION */}
        <div
          className='p-5 rounded-3 text-center mb-5'
          style={{ background: '#e6fff2' }}
        >
          <h2 className='fw-bold'>Thank You</h2>
          <p className='mb-4' style={{ maxWidth: '700px', margin: '0 auto' }}>
            To every mom, every family and every supporter — thank you for
            believing in us, choosing handmade, and helping us grow.
            <br />
            Nevan Handicraft will always remain what it started as:
            <br />
            <b>A mother’s love turned into something beautiful. 💛</b>
          </p>

          {/* FIX IS HERE: Added Link Wrapper */}
          <Link to='/contact'>
            <Button variant='success' size='lg'>
              Contact Us
            </Button>
          </Link>
        </div>
      </Container>
    </>
  );
};

export default AboutScreen;
